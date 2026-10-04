import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { runDatabaseTransaction } from '../database/database-transaction';
import { OrderGroup } from '../order-groups/entities/order-group.entity';
import { Order } from '../orders/entities/order.entity';
import { isAllocatableOrderStatus } from './customer-finance';
import { getCustomerFinanceRevision } from './customer-finance-revision';
import {
  AllocationBatchItemDto,
  CreateAllocationBatchDto,
} from './dto/allocation-batch.dto';
import {
  FinancialAllocationBatch,
  FinancialAllocationBatchRequestSnapshot,
} from './entities/financial-allocation-batch.entity';
import { FinancialAccrualEntry } from './entities/financial-accrual-entry.entity';
import {
  FinancialAccrual,
  FinancialAccrualStatus,
  FinancialAccrualSourceType,
} from './entities/financial-accrual.entity';
import {
  FinancialPaymentAllocation,
  FinancialPaymentAllocationStatus,
} from './entities/financial-payment-allocation.entity';
import {
  FinancialPayment,
  FinancialPaymentStatus,
} from './entities/financial-payment.entity';
import {
  assertSafeMinorAmount,
  formatMinorToRubles,
  parseRublesToMinor,
} from './finance-money';

type ResolvedLine = {
  accrualId: string;
  orderGroupId: number;
  amountMinor: number;
};

@Injectable()
export class FinanceAllocationBatchesService {
  constructor(private readonly source: DataSource) {}

  async create(dto: CreateAllocationBatchDto) {
    const replay = await this.source
      .getRepository(FinancialAllocationBatch)
      .findOneBy({ requestId: dto.requestId });
    if (replay) {
      const lines = await this.resolveLines(
        this.source.manager,
        dto.customerId,
        dto.allocations,
      );
      this.assertReplay(replay, dto, lines);
      return this.getResult(replay.id);
    }

    try {
      return await runDatabaseTransaction(this.source, async (manager) => {
        const customer = await manager.getRepository(Customer).findOneBy({
          id: dto.customerId,
        });
        if (!customer) throw new NotFoundException('Customer not found');

        const lines = await this.resolveLines(
          manager,
          dto.customerId,
          dto.allocations,
        );
        if (lines.length === 0) {
          throw new BadRequestException(
            'At least one positive allocation is required',
          );
        }

        const payments = await manager.getRepository(FinancialPayment).find({
          where: {
            customerId: dto.customerId,
            status: FinancialPaymentStatus.POSTED,
          },
          order: { paymentDate: 'ASC', createdAt: 'ASC', id: 'ASC' },
          ...(this.isPostgres(manager)
            ? { lock: { mode: 'pessimistic_write' as const } }
            : {}),
        });
        const accrualIds = lines.map((line) => line.accrualId).sort();
        const accruals = await manager.getRepository(FinancialAccrual).find({
          where: { id: In(accrualIds) },
          order: { id: 'ASC' },
          ...(this.isPostgres(manager)
            ? { lock: { mode: 'pessimistic_write' as const } }
            : {}),
        });
        if (accruals.length !== accrualIds.length) {
          throw new NotFoundException('Accrual not found');
        }

        const allocations = await this.lockActiveAllocations(
          manager,
          payments.map((payment) => payment.id),
          accrualIds,
        );
        const groupIds = lines
          .map((line) => line.orderGroupId)
          .sort((a, b) => a - b);
        const groups = await manager.getRepository(OrderGroup).find({
          where: { id: In(groupIds) },
          order: { id: 'ASC' },
          ...(this.isPostgres(manager)
            ? { lock: { mode: 'pessimistic_write' as const } }
            : {}),
        });
        const ordersQuery = manager
          .getRepository(Order)
          .createQueryBuilder('orders')
          .innerJoinAndSelect('orders.orderGroup', 'orderGroup')
          .where('orderGroup.id IN (:...groupIds)', { groupIds })
          .orderBy('orders.id', 'ASC');
        if (this.isPostgres(manager)) {
          ordersQuery.setLock('pessimistic_write');
        }
        const orders = await ordersQuery.getMany();

        const currentRevision = await getCustomerFinanceRevision(
          manager,
          dto.customerId,
        );
        if (currentRevision !== dto.expectedRevision) {
          throw new ConflictException(
            'Customer finance data was changed; reload and retry',
          );
        }

        const accrualById = new Map(accruals.map((item) => [item.id, item]));
        const groupById = new Map(groups.map((item) => [item.id, item]));
        const orderTotals = this.orderTotals(orders);
        const allocationByAccrual = this.sumBy(
          allocations,
          (item) => item.accrualId,
        );
        const accrualTotals = await this.accrualTotals(manager, accrualIds);

        for (const line of lines) {
          const accrual = accrualById.get(line.accrualId)!;
          const group = groupById.get(line.orderGroupId);
          if (
            accrual.customerId !== dto.customerId ||
            accrual.sourceType !== FinancialAccrualSourceType.ORDER ||
            accrual.orderGroupId !== line.orderGroupId
          ) {
            throw new ConflictException(
              'Accrual does not belong to the selected customer order',
            );
          }
          if (accrual.status !== FinancialAccrualStatus.ACTIVE) {
            throw new ConflictException('Accrual is not active');
          }
          if (!group || group.customerId !== dto.customerId) {
            throw new ConflictException('Order does not belong to customer');
          }
          if (!isAllocatableOrderStatus(group.status)) {
            throw new ConflictException('Order is closed or cancelled');
          }
          const allocatedMinor = allocationByAccrual.get(line.accrualId) ?? 0;
          const orderDebt = Math.max(
            (orderTotals.get(line.orderGroupId) ?? 0) - allocatedMinor,
            0,
          );
          const accrualDebt = Math.max(
            (accrualTotals.get(line.accrualId) ?? 0) - allocatedMinor,
            0,
          );
          if (line.amountMinor > orderDebt || line.amountMinor > accrualDebt) {
            throw new ConflictException('Allocation exceeds order debt');
          }
        }

        const allocationByPayment = this.sumBy(
          allocations,
          (item) => item.paymentId,
        );
        const paymentRemainders = payments.map((payment) => ({
          payment,
          remainingMinor:
            payment.amountMinor - (allocationByPayment.get(payment.id) ?? 0),
        }));
        const unallocatedMinor = paymentRemainders.reduce(
          (sum, item) => sum + item.remainingMinor,
          0,
        );
        assertSafeMinorAmount(unallocatedMinor);
        const totalMinor = lines.reduce(
          (sum, line) => sum + line.amountMinor,
          0,
        );
        assertSafeMinorAmount(totalMinor);
        if (unallocatedMinor <= 0 || totalMinor > unallocatedMinor) {
          throw new ConflictException('Insufficient unallocated balance');
        }

        const requestSnapshot = this.requestSnapshot(dto, lines);
        const resultSnapshot = lines.map((line) => {
          const group = groupById.get(line.orderGroupId)!;
          const previousAllocated =
            allocationByAccrual.get(line.accrualId) ?? 0;
          return {
            accrualId: line.accrualId,
            orderGroupId: line.orderGroupId,
            orderNumber: group.orderNumber,
            allocatedMinor: line.amountMinor,
            newDebtMinor: Math.max(
              (orderTotals.get(line.orderGroupId) ?? 0) -
                previousAllocated -
                line.amountMinor,
              0,
            ),
          };
        });
        const batch = await manager
          .getRepository(FinancialAllocationBatch)
          .save({
            customerId: dto.customerId,
            requestId: dto.requestId,
            comment: dto.comment?.trim() || null,
            authorName: null,
            totalMinor,
            balanceAfterMinor: unallocatedMinor - totalMinor,
            requestSnapshot,
            resultSnapshot,
          });

        const newAllocations: Array<{
          paymentId: string;
          accrualId: string;
          batchId: number;
          amountMinor: number;
          status: FinancialPaymentAllocationStatus;
          releasedAt: null;
          releaseReason: null;
        }> = [];
        const touchedPaymentIds = new Set<string>();
        for (const line of lines) {
          let remaining = line.amountMinor;
          for (const source of paymentRemainders) {
            if (remaining === 0) break;
            if (source.remainingMinor <= 0) continue;
            const amountMinor = Math.min(remaining, source.remainingMinor);
            newAllocations.push({
              paymentId: source.payment.id,
              accrualId: line.accrualId,
              batchId: batch.id,
              amountMinor,
              status: FinancialPaymentAllocationStatus.ACTIVE,
              releasedAt: null,
              releaseReason: null,
            });
            source.remainingMinor -= amountMinor;
            remaining -= amountMinor;
            touchedPaymentIds.add(source.payment.id);
          }
          if (remaining !== 0) {
            throw new ConflictException('Insufficient unallocated balance');
          }
        }
        await manager
          .getRepository(FinancialPaymentAllocation)
          .insert(newAllocations);
        await manager
          .getRepository(FinancialPayment)
          .createQueryBuilder()
          .update()
          .set({ version: () => 'version + 1' })
          .where('id IN (:...ids)', { ids: [...touchedPaymentIds].sort() })
          .execute();

        return this.getResult(batch.id, manager);
      });
    } catch (error) {
      const replay = await this.source
        .getRepository(FinancialAllocationBatch)
        .findOneBy({ requestId: dto.requestId });
      if (replay) {
        const lines = await this.resolveLines(
          this.source.manager,
          dto.customerId,
          dto.allocations,
        );
        this.assertReplay(replay, dto, lines);
        return this.getResult(replay.id);
      }
      throw error;
    }
  }

  async getResult(id: number, manager: EntityManager = this.source.manager) {
    const batch = await manager
      .getRepository(FinancialAllocationBatch)
      .findOne({
        where: { id },
        relations: { customer: true },
      });
    if (!batch) throw new NotFoundException('Allocation batch not found');
    const sources = await manager
      .getRepository(FinancialPaymentAllocation)
      .createQueryBuilder('allocation')
      .innerJoin(
        FinancialPayment,
        'payment',
        'payment.id = allocation.paymentId',
      )
      .select('allocation.id', 'id')
      .addSelect('allocation.paymentId', 'paymentId')
      .addSelect('allocation.accrualId', 'accrualId')
      .addSelect('allocation.amountMinor', 'amountMinor')
      .addSelect('payment.paymentDate', 'paymentDate')
      .where('allocation.batchId = :id', { id })
      .orderBy('payment.paymentDate', 'ASC')
      .addOrderBy('payment.createdAt', 'ASC')
      .addOrderBy('payment.id', 'ASC')
      .addOrderBy('allocation.id', 'ASC')
      .getRawMany<Record<string, unknown>>();

    return {
      id: batch.id,
      number: `Распределение №${batch.id} от ${this.formatDate(batch.createdAt)}`,
      customer: {
        id: batch.customer.id,
        name: batch.customer.name,
        companyName: batch.customer.companyName ?? null,
      },
      createdAt: batch.createdAt,
      comment: batch.comment,
      employee: batch.authorName,
      total: formatMinorToRubles(batch.totalMinor),
      balanceAfter: formatMinorToRubles(batch.balanceAfterMinor),
      orders: batch.resultSnapshot.map((item) => ({
        accrualId: item.accrualId,
        orderGroupId: item.orderGroupId,
        orderNumber: item.orderNumber,
        allocated: formatMinorToRubles(item.allocatedMinor),
        newDebt: formatMinorToRubles(item.newDebtMinor),
      })),
      paymentSources: sources.map((item) => ({
        allocationId: String(item.id),
        paymentId: String(item.paymentId),
        accrualId: String(item.accrualId),
        paymentDate: String(item.paymentDate),
        amount: formatMinorToRubles(this.number(item.amountMinor)),
      })),
    };
  }

  private async resolveLines(
    manager: EntityManager,
    customerId: string,
    items: AllocationBatchItemDto[],
  ): Promise<ResolvedLine[]> {
    const parsed = items
      .map((item) => ({ item, amountMinor: this.parseAmount(item.amount) }))
      .filter(({ amountMinor }) => amountMinor > 0);
    for (const { item } of parsed) {
      if (Boolean(item.accrualId) === Boolean(item.orderGroupId)) {
        throw new BadRequestException(
          'Exactly one of accrualId or orderGroupId is required',
        );
      }
    }
    if (parsed.length === 0) return [];

    const accrualIds = parsed
      .flatMap(({ item }) => (item.accrualId ? [item.accrualId] : []))
      .sort();
    const orderGroupIds = parsed
      .flatMap(({ item }) =>
        item.orderGroupId === undefined ? [] : [item.orderGroupId],
      )
      .sort((a, b) => a - b);
    const accruals = await manager.getRepository(FinancialAccrual).find({
      where: [
        ...(accrualIds.length ? [{ customerId, id: In(accrualIds) }] : []),
        ...(orderGroupIds.length
          ? [{ customerId, orderGroupId: In(orderGroupIds) }]
          : []),
      ],
      order: { id: 'ASC' },
    });
    const byId = new Map(accruals.map((item) => [item.id, item]));
    const byGroup = new Map(
      accruals
        .filter((item) => item.orderGroupId !== null)
        .map((item) => [item.orderGroupId!, item]),
    );
    const lines = parsed.map(({ item, amountMinor }) => {
      const accrual = item.accrualId
        ? byId.get(item.accrualId)
        : byGroup.get(item.orderGroupId!);
      if (!accrual || accrual.orderGroupId === null) {
        throw new NotFoundException('Order accrual not found');
      }
      return {
        accrualId: accrual.id,
        orderGroupId: accrual.orderGroupId,
        amountMinor,
      };
    });
    const uniqueOrders = new Set(lines.map((line) => line.orderGroupId));
    if (uniqueOrders.size !== lines.length) {
      throw new BadRequestException('Duplicate orders are not allowed');
    }
    return lines;
  }

  private async lockActiveAllocations(
    manager: EntityManager,
    paymentIds: string[],
    accrualIds: string[],
  ): Promise<FinancialPaymentAllocation[]> {
    const qb = manager
      .getRepository(FinancialPaymentAllocation)
      .createQueryBuilder('allocation')
      .where('allocation.status = :status', {
        status: FinancialPaymentAllocationStatus.ACTIVE,
      })
      .orderBy('allocation.paymentId', 'ASC')
      .addOrderBy('allocation.accrualId', 'ASC')
      .addOrderBy('allocation.id', 'ASC');
    if (paymentIds.length) {
      qb.andWhere(
        '(allocation.paymentId IN (:...paymentIds) OR allocation.accrualId IN (:...accrualIds))',
        { paymentIds, accrualIds },
      );
    } else {
      qb.andWhere('allocation.accrualId IN (:...accrualIds)', { accrualIds });
    }
    if (this.isPostgres(manager)) qb.setLock('pessimistic_write');
    return qb.getMany();
  }

  private async accrualTotals(manager: EntityManager, accrualIds: string[]) {
    const rows = await manager
      .getRepository(FinancialAccrualEntry)
      .createQueryBuilder('entry')
      .select('entry.accrualId', 'accrualId')
      .addSelect('SUM(entry.amountMinor)', 'amount')
      .where('entry.accrualId IN (:...accrualIds)', { accrualIds })
      .groupBy('entry.accrualId')
      .getRawMany<{ accrualId: string; amount: string | number }>();
    return new Map(rows.map((row) => [row.accrualId, this.number(row.amount)]));
  }

  private orderTotals(orders: Order[]) {
    const totals = new Map<number, number>();
    for (const order of orders) {
      const groupId = order.orderGroup?.id;
      if (groupId === undefined) continue;
      const amountMinor = parseRublesToMinor(
        Number(order.totalPrice).toFixed(2),
        { allowNegative: true, allowZero: true },
      );
      totals.set(groupId, (totals.get(groupId) ?? 0) + amountMinor);
    }
    for (const value of totals.values()) assertSafeMinorAmount(value);
    return totals;
  }

  private sumBy(
    rows: FinancialPaymentAllocation[],
    key: (row: FinancialPaymentAllocation) => string,
  ) {
    const result = new Map<string, number>();
    for (const row of rows) {
      result.set(key(row), (result.get(key(row)) ?? 0) + row.amountMinor);
    }
    for (const value of result.values()) assertSafeMinorAmount(value);
    return result;
  }

  private requestSnapshot(
    dto: CreateAllocationBatchDto,
    lines: ResolvedLine[],
  ): FinancialAllocationBatchRequestSnapshot {
    return {
      comment: dto.comment?.trim() || null,
      allocations: [...lines].sort((a, b) =>
        a.orderGroupId === b.orderGroupId
          ? a.accrualId.localeCompare(b.accrualId)
          : a.orderGroupId - b.orderGroupId,
      ),
    };
  }

  private assertReplay(
    batch: FinancialAllocationBatch,
    dto: CreateAllocationBatchDto,
    lines: ResolvedLine[],
  ) {
    if (
      batch.customerId !== dto.customerId ||
      JSON.stringify(batch.requestSnapshot) !==
        JSON.stringify(this.requestSnapshot(dto, lines))
    ) {
      throw new ConflictException(
        'requestId was already used with different command data',
      );
    }
  }

  private parseAmount(value: string) {
    try {
      return parseRublesToMinor(value, { allowZero: true });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid money amount',
      );
    }
  }

  private number(value: unknown) {
    const result = Number(value ?? 0);
    assertSafeMinorAmount(result);
    return result;
  }

  private formatDate(value: Date) {
    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
    }).format(date);
  }

  private isPostgres(manager: EntityManager) {
    return manager.connection.options.type === 'postgres';
  }
}
