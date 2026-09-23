import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  QueryFailedError,
  Repository,
} from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { runDatabaseTransaction } from '../database/database-transaction';
import { OrderGroup } from '../order-groups/entities/order-group.entity';
import { Order } from '../orders/entities/order.entity';
import {
  AdjustAccrualDto,
  CancelAccrualDto,
  CreateManualAccrualDto,
  CreateOrderAccrualDto,
  SyncOrderAccrualDto,
} from './dto/accrual.dto';
import {
  FinancialAccrualEntry,
  FinancialAccrualEntryKind,
} from './entities/financial-accrual-entry.entity';
import {
  FinancialAccrual,
  FinancialAccrualSourceType,
  FinancialAccrualStatus,
} from './entities/financial-accrual.entity';
import {
  FinancialPaymentAllocation,
  FinancialPaymentAllocationStatus,
} from './entities/financial-payment-allocation.entity';
import {
  assertSafeMinorAmount,
  formatMinorToRubles,
  parseRublesToMinor,
} from './finance-money';

export type FinancialAccrualView = {
  id: string;
  customerId: string;
  sourceType: FinancialAccrualSourceType;
  orderGroupId: number | null;
  title: string;
  status: FinancialAccrualStatus;
  version: number;
  amountMinor: number;
  amount: string;
};

@Injectable()
export class FinanceAccrualsService {
  constructor(
    private readonly source: DataSource,
    @InjectRepository(FinancialAccrual)
    private readonly accrualRepository: Repository<FinancialAccrual>,
  ) {}

  async createFromOrder(
    dto: CreateOrderAccrualDto,
  ): Promise<FinancialAccrualView> {
    const replay = await this.findReplay(dto.requestId);
    if (replay) {
      this.assertReplay(replay, {
        kind: FinancialAccrualEntryKind.INITIAL,
        effectiveDate: dto.effectiveDate,
        sourceType: FinancialAccrualSourceType.ORDER,
        orderGroupId: dto.orderGroupId,
      });
      return this.read(replay.accrual);
    }

    try {
      return await runDatabaseTransaction(this.source, async (manager) => {
        const group = await manager.getRepository(OrderGroup).findOne({
          where: { id: dto.orderGroupId },
          relations: { orders: true },
        });
        if (!group) throw new NotFoundException('Order group not found');
        if (!group.customerId) {
          throw new UnprocessableEntityException(
            'Order group must have a customer before accrual creation',
          );
        }
        if (
          await manager.getRepository(FinancialAccrual).existsBy({
            orderGroupId: group.id,
          })
        ) {
          throw new ConflictException('Order group already has an accrual');
        }
        const amountMinor = this.sumOrderDocuments(group.orders);
        if (amountMinor <= 0) {
          throw new UnprocessableEntityException(
            'Order group total must be positive',
          );
        }
        const accrual = await manager.getRepository(FinancialAccrual).save({
          customerId: group.customerId,
          sourceType: FinancialAccrualSourceType.ORDER,
          orderGroupId: group.id,
          title: group.orderNumber,
          status: FinancialAccrualStatus.ACTIVE,
          version: 0,
        });
        await manager.getRepository(FinancialAccrualEntry).insert({
          accrualId: accrual.id,
          kind: FinancialAccrualEntryKind.INITIAL,
          amountMinor,
          effectiveDate: dto.effectiveDate,
          reason: null,
          reversesEntryId: null,
          requestId: dto.requestId,
        });
        return this.read(accrual, amountMinor);
      });
    } catch (error) {
      return this.handleCreateRace(error, dto.requestId, () =>
        this.createFromOrder(dto),
      );
    }
  }

  async createManual(
    dto: CreateManualAccrualDto,
  ): Promise<FinancialAccrualView> {
    const amountMinor = this.parsePositive(dto.amount);
    const replay = await this.findReplay(dto.requestId);
    if (replay) {
      this.assertReplay(replay, {
        kind: FinancialAccrualEntryKind.INITIAL,
        amountMinor,
        effectiveDate: dto.effectiveDate,
        reason: dto.reason ?? null,
        sourceType: FinancialAccrualSourceType.MANUAL,
        customerId: dto.customerId,
        title: dto.title,
      });
      return this.read(replay.accrual);
    }

    try {
      return await runDatabaseTransaction(this.source, async (manager) => {
        if (
          !(await manager
            .getRepository(Customer)
            .existsBy({ id: dto.customerId }))
        ) {
          throw new NotFoundException('Customer not found');
        }
        const accrual = await manager.getRepository(FinancialAccrual).save({
          customerId: dto.customerId,
          sourceType: FinancialAccrualSourceType.MANUAL,
          orderGroupId: null,
          title: dto.title,
          status: FinancialAccrualStatus.ACTIVE,
          version: 0,
        });
        await manager.getRepository(FinancialAccrualEntry).insert({
          accrualId: accrual.id,
          kind: FinancialAccrualEntryKind.INITIAL,
          amountMinor,
          effectiveDate: dto.effectiveDate,
          reason: dto.reason ?? null,
          reversesEntryId: null,
          requestId: dto.requestId,
        });
        return this.read(accrual, amountMinor);
      });
    } catch (error) {
      return this.handleCreateRace(error, dto.requestId, () =>
        this.createManual(dto),
      );
    }
  }

  syncOrderTotal(
    id: string,
    dto: SyncOrderAccrualDto,
  ): Promise<FinancialAccrualView> {
    return this.changeAccrual(
      id,
      dto,
      async (manager, accrual, current) => {
        if (
          accrual.sourceType !== FinancialAccrualSourceType.ORDER ||
          !accrual.orderGroupId
        ) {
          throw new ConflictException(
            'Only order accruals can be synchronized',
          );
        }
        const group = await this.getOrderGroup(accrual.orderGroupId, manager);
        if (group.customerId !== accrual.customerId) {
          throw new ConflictException(
            'Order group customer does not match accrual customer',
          );
        }
        const orderTotal = this.sumOrderDocuments(group.orders);
        const difference = orderTotal - current;
        if (difference === 0) return null;
        return {
          kind: FinancialAccrualEntryKind.ADJUSTMENT,
          amountMinor: difference,
          effectiveDate: dto.effectiveDate,
          reason: 'Order total synchronization',
        };
      },
      {
        kind: FinancialAccrualEntryKind.ADJUSTMENT,
        effectiveDate: dto.effectiveDate,
        reason: 'Order total synchronization',
        sourceType: FinancialAccrualSourceType.ORDER,
      },
    );
  }

  adjust(id: string, dto: AdjustAccrualDto): Promise<FinancialAccrualView> {
    const amountMinor = this.parseSigned(dto.amount);
    return this.changeAccrual(
      id,
      dto,
      () => ({
        kind: FinancialAccrualEntryKind.ADJUSTMENT,
        amountMinor,
        effectiveDate: dto.effectiveDate,
        reason: dto.reason,
      }),
      {
        kind: FinancialAccrualEntryKind.ADJUSTMENT,
        amountMinor,
        effectiveDate: dto.effectiveDate,
        reason: dto.reason,
      },
    );
  }

  cancel(id: string, dto: CancelAccrualDto): Promise<FinancialAccrualView> {
    return this.changeAccrual(
      id,
      dto,
      (_manager, accrual, current) => {
        if (accrual.status === FinancialAccrualStatus.CANCELLED) {
          throw new ConflictException('Accrual is already cancelled');
        }
        if (current === 0) {
          throw new UnprocessableEntityException(
            'Zero accrual cannot be cancelled with a reversal',
          );
        }
        return {
          kind: FinancialAccrualEntryKind.REVERSAL,
          amountMinor: -current,
          effectiveDate: dto.effectiveDate,
          reason: dto.reason,
          cancel: true,
        };
      },
      {
        kind: FinancialAccrualEntryKind.REVERSAL,
        effectiveDate: dto.effectiveDate,
        reason: dto.reason,
      },
    );
  }

  private async changeAccrual(
    id: string,
    dto: VersionedCommand,
    buildEntry: (
      manager: EntityManager,
      accrual: FinancialAccrual,
      current: number,
    ) => PendingEntry | null | Promise<PendingEntry | null>,
    replayExpectation: ReplayExpectation,
  ): Promise<FinancialAccrualView> {
    const replay = await this.findReplay(dto.requestId);
    if (replay) {
      if (replay.accrual.id !== id) this.throwReplayConflict();
      this.assertReplay(replay, replayExpectation);
      return this.read(replay.accrual);
    }

    try {
      return await runDatabaseTransaction(this.source, async (manager) => {
        const accrual = await manager.getRepository(FinancialAccrual).findOne({
          where: { id },
          ...(manager.connection.options.type === 'postgres'
            ? { lock: { mode: 'pessimistic_write' as const } }
            : {}),
        });
        if (!accrual) throw new NotFoundException('Accrual not found');
        if (accrual.status !== FinancialAccrualStatus.ACTIVE) {
          throw new ConflictException('Accrual is not active');
        }
        if (accrual.version !== dto.expectedVersion) {
          throw new ConflictException('Accrual was changed; reload and retry');
        }
        const current = await this.sumEntries(manager, id);
        const pending = await buildEntry(manager, accrual, current);
        if (!pending) return this.read(accrual, current);
        await this.assertNotBelowAllocated(
          manager,
          id,
          current + pending.amountMinor,
        );
        const update = await manager
          .getRepository(FinancialAccrual)
          .createQueryBuilder()
          .update()
          .set({
            version: () => 'version + 1',
            ...(pending.cancel
              ? {
                  status: FinancialAccrualStatus.CANCELLED,
                  cancelledAt: new Date(),
                  cancellationReason: pending.reason,
                }
              : {}),
          })
          .where('id = :id AND version = :expectedVersion', {
            id,
            expectedVersion: dto.expectedVersion,
          })
          .execute();
        if (update.affected !== 1) {
          throw new ConflictException('Accrual was changed; reload and retry');
        }
        await manager.getRepository(FinancialAccrualEntry).insert({
          accrualId: id,
          kind: pending.kind,
          amountMinor: pending.amountMinor,
          effectiveDate: pending.effectiveDate,
          reason: pending.reason,
          reversesEntryId: null,
          requestId: dto.requestId,
        });
        accrual.version += 1;
        if (pending.cancel) {
          accrual.status = FinancialAccrualStatus.CANCELLED;
          accrual.cancelledAt = new Date();
          accrual.cancellationReason = pending.reason;
        }
        return this.read(accrual, current + pending.amountMinor);
      });
    } catch (error) {
      return this.handleCreateRace(error, dto.requestId, () =>
        this.changeAccrual(id, dto, buildEntry, replayExpectation),
      );
    }
  }

  private async findReplay(requestId: string) {
    const entry = await this.source
      .getRepository(FinancialAccrualEntry)
      .findOne({
        where: { requestId },
        relations: { accrual: true },
      });
    return entry ? { entry, accrual: entry.accrual } : null;
  }

  private assertReplay(
    replay: NonNullable<
      Awaited<ReturnType<FinanceAccrualsService['findReplay']>>
    >,
    expected: ReplayExpectation,
  ) {
    const { entry, accrual } = replay;
    const matches =
      (expected.kind === undefined || entry.kind === expected.kind) &&
      (expected.amountMinor === undefined ||
        entry.amountMinor === expected.amountMinor) &&
      (expected.effectiveDate === undefined ||
        entry.effectiveDate === expected.effectiveDate) &&
      (expected.reason === undefined || entry.reason === expected.reason) &&
      (expected.sourceType === undefined ||
        accrual.sourceType === expected.sourceType) &&
      (expected.orderGroupId === undefined ||
        accrual.orderGroupId === expected.orderGroupId) &&
      (expected.customerId === undefined ||
        accrual.customerId === expected.customerId) &&
      (expected.title === undefined || accrual.title === expected.title);
    if (!matches) this.throwReplayConflict();
  }

  private throwReplayConflict(): never {
    throw new ConflictException(
      'requestId was already used with different command data',
    );
  }

  private async handleCreateRace<T>(
    error: unknown,
    requestId: string,
    replay: () => Promise<T>,
  ): Promise<T> {
    if (error instanceof QueryFailedError) {
      if (await this.findReplay(requestId)) return replay();
      throw new ConflictException(
        'Financial command conflicts with existing data',
      );
    }
    throw error;
  }

  private async read(
    accrual: FinancialAccrual,
    knownAmount?: number,
  ): Promise<FinancialAccrualView> {
    const amountMinor =
      knownAmount ?? (await this.sumEntries(this.source.manager, accrual.id));
    return {
      id: accrual.id,
      customerId: accrual.customerId,
      sourceType: accrual.sourceType,
      orderGroupId: accrual.orderGroupId,
      title: accrual.title,
      status: accrual.status,
      version: accrual.version,
      amountMinor,
      amount: formatMinorToRubles(amountMinor),
    };
  }

  private async sumEntries(manager: EntityManager, accrualId: string) {
    const result = await manager
      .getRepository(FinancialAccrualEntry)
      .createQueryBuilder('entry')
      .select('COALESCE(SUM(entry.amountMinor), 0)', 'amount')
      .where('entry.accrualId = :accrualId', { accrualId })
      .getRawOne<{ amount: string | number }>();
    const amount = Number(result?.amount ?? 0);
    assertSafeMinorAmount(amount);
    return amount;
  }

  private async assertNotBelowAllocated(
    manager: EntityManager,
    accrualId: string,
    nextAmount: number,
  ) {
    const result = await manager
      .getRepository(FinancialPaymentAllocation)
      .createQueryBuilder('allocation')
      .select('COALESCE(SUM(allocation.amountMinor), 0)', 'amount')
      .where('allocation.accrualId = :accrualId', { accrualId })
      .andWhere('allocation.status = :status', {
        status: FinancialPaymentAllocationStatus.ACTIVE,
      })
      .getRawOne<{ amount: string | number }>();
    const allocated = Number(result?.amount ?? 0);
    if (nextAmount < allocated) {
      throw new UnprocessableEntityException(
        'Accrual amount cannot be lower than active allocations',
      );
    }
  }

  private async getOrderGroup(
    orderGroupId: number,
    manager = this.source.manager,
  ) {
    const group = await manager.getRepository(OrderGroup).findOne({
      where: { id: orderGroupId },
      relations: { orders: true },
    });
    if (!group) throw new NotFoundException('Order group not found');
    return group;
  }

  private sumOrderDocuments(orders: Order[]) {
    const amount = orders.reduce(
      (sum, order) =>
        sum +
        parseRublesToMinor(Number(order.totalPrice).toFixed(2), {
          allowZero: true,
          allowNegative: true,
        }),
      0,
    );
    assertSafeMinorAmount(amount);
    return amount;
  }

  private parsePositive(value: string) {
    try {
      return parseRublesToMinor(value);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid money amount',
      );
    }
  }

  private parseSigned(value: string) {
    try {
      return parseRublesToMinor(value, { allowNegative: true });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid money amount',
      );
    }
  }
}

type VersionedCommand = {
  expectedVersion: number;
  requestId: string;
};

type PendingEntry = {
  kind: FinancialAccrualEntryKind;
  amountMinor: number;
  effectiveDate: string;
  reason: string | null;
  cancel?: boolean;
};

type ReplayExpectation = Partial<{
  kind: FinancialAccrualEntryKind;
  amountMinor: number;
  effectiveDate: string;
  reason: string | null;
  sourceType: FinancialAccrualSourceType;
  orderGroupId: number;
  customerId: string;
  title: string;
}>;
