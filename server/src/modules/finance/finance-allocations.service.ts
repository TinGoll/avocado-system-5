import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { runDatabaseTransaction } from '../database/database-transaction';
import {
  PaymentAllocationItemDto,
  ReplacePaymentAllocationsDto,
} from './dto/payment.dto';
import { FinancialAccrualEntry } from './entities/financial-accrual-entry.entity';
import {
  FinancialAccrual,
  FinancialAccrualStatus,
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

export type FinancialPaymentAllocationView = {
  id: string;
  accrualId: string;
  amountMinor: number;
  amount: string;
  status: FinancialPaymentAllocationStatus;
  createdAt: Date;
  releasedAt: Date | null;
  releaseReason: string | null;
};

@Injectable()
export class FinanceAllocationsService {
  constructor(private readonly source: DataSource) {}

  async replace(
    paymentId: string,
    dto: ReplacePaymentAllocationsDto,
  ): Promise<FinancialPayment> {
    return runDatabaseTransaction(this.source, async (manager) => {
      const payment = await this.lockPayment(manager, paymentId);
      if (payment.version !== dto.expectedVersion) {
        throw new ConflictException('Payment was changed; reload and retry');
      }
      await this.applyMap(manager, payment, dto.allocations, dto.reason, true);
      payment.version += 1;
      return payment;
    });
  }

  async createInitial(
    manager: EntityManager,
    payment: FinancialPayment,
    allocations: PaymentAllocationItemDto[],
  ): Promise<void> {
    if (allocations.length === 0) return;
    await this.applyMap(manager, payment, allocations, undefined, false);
  }

  async read(
    paymentId: string,
    manager: EntityManager = this.source.manager,
  ): Promise<{
    allocations: FinancialPaymentAllocationView[];
    allocatedMinor: number;
    allocated: string;
  }> {
    const rows = await manager.getRepository(FinancialPaymentAllocation).find({
      where: { paymentId },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    const allocatedMinor = rows
      .filter((row) => row.status === FinancialPaymentAllocationStatus.ACTIVE)
      .reduce((sum, row) => sum + row.amountMinor, 0);
    assertSafeMinorAmount(allocatedMinor);
    return {
      allocations: rows.map((row) => ({
        id: row.id,
        accrualId: row.accrualId,
        amountMinor: row.amountMinor,
        amount: formatMinorToRubles(row.amountMinor),
        status: row.status,
        createdAt: row.createdAt,
        releasedAt: row.releasedAt,
        releaseReason: row.releaseReason,
      })),
      allocatedMinor,
      allocated: formatMinorToRubles(allocatedMinor),
    };
  }

  private async applyMap(
    manager: EntityManager,
    payment: FinancialPayment,
    requested: PaymentAllocationItemDto[],
    reason: string | undefined,
    incrementVersion: boolean,
  ) {
    if (payment.status !== FinancialPaymentStatus.POSTED) {
      throw new ConflictException('Payment is not active');
    }
    const desired = this.parseMap(requested);
    const allocationRepository = manager.getRepository(
      FinancialPaymentAllocation,
    );
    const currentSnapshot = await allocationRepository.find({
      where: {
        paymentId: payment.id,
        status: FinancialPaymentAllocationStatus.ACTIVE,
      },
      order: { accrualId: 'ASC', id: 'ASC' },
    });
    const desiredAccrualIds = [...desired.keys()].sort();
    const touchedAccrualIds = [
      ...new Set([
        ...desiredAccrualIds,
        ...currentSnapshot.map((row) => row.accrualId),
      ]),
    ].sort();
    const accruals = touchedAccrualIds.length
      ? await manager.getRepository(FinancialAccrual).find({
          where: { id: In(touchedAccrualIds) },
          order: { id: 'ASC' },
          ...(manager.connection.options.type === 'postgres'
            ? { lock: { mode: 'pessimistic_write' as const } }
            : {}),
        })
      : [];
    if (accruals.length !== touchedAccrualIds.length) {
      throw new NotFoundException('Accrual not found');
    }
    for (const accrual of accruals.filter((item) => desired.has(item.id))) {
      if (accrual.customerId !== payment.customerId) {
        throw new ConflictException('Payment and accrual customers differ');
      }
      if (accrual.status !== FinancialAccrualStatus.ACTIVE) {
        throw new ConflictException('Accrual is not active');
      }
    }

    const allActive = touchedAccrualIds.length
      ? await allocationRepository.find({
          where: {
            accrualId: In(touchedAccrualIds),
            status: FinancialPaymentAllocationStatus.ACTIVE,
          },
          order: { accrualId: 'ASC', id: 'ASC' },
          ...(manager.connection.options.type === 'postgres'
            ? { lock: { mode: 'pessimistic_write' as const } }
            : {}),
        })
      : [];
    const currentRows = allActive.filter((row) => row.paymentId === payment.id);
    const current = new Map(currentRows.map((row) => [row.accrualId, row]));
    const requestedTotal = [...desired.values()].reduce(
      (sum, value) => sum + value,
      0,
    );
    assertSafeMinorAmount(requestedTotal);
    if (requestedTotal > payment.amountMinor) {
      throw new ConflictException('Allocations exceed payment amount');
    }

    for (const accrual of accruals.filter((item) => desired.has(item.id))) {
      const entryTotal = await this.sumAccrual(manager, accrual.id);
      const allocatedByOthers = allActive
        .filter(
          (row) => row.accrualId === accrual.id && row.paymentId !== payment.id,
        )
        .reduce((sum, row) => sum + row.amountMinor, 0);
      if (allocatedByOthers + (desired.get(accrual.id) ?? 0) > entryTotal) {
        throw new ConflictException('Allocation exceeds accrual remainder');
      }
    }

    const changed = currentRows.filter(
      (row) => desired.get(row.accrualId) !== row.amountMinor,
    );
    if (changed.length && !reason?.trim()) {
      throw new BadRequestException(
        'Reason is required when releasing allocations',
      );
    }
    if (changed.length) {
      const now = new Date();
      await allocationRepository.update(
        { id: In(changed.map((row) => row.id)) },
        {
          status: FinancialPaymentAllocationStatus.RELEASED,
          releasedAt: now,
          releaseReason: reason!,
        },
      );
    }
    const additions = desiredAccrualIds
      .filter(
        (accrualId) =>
          current.get(accrualId)?.amountMinor !== desired.get(accrualId),
      )
      .map((accrualId) =>
        allocationRepository.create({
          paymentId: payment.id,
          accrualId,
          amountMinor: desired.get(accrualId)!,
          status: FinancialPaymentAllocationStatus.ACTIVE,
          releasedAt: null,
          releaseReason: null,
        }),
      );
    if (additions.length) await allocationRepository.save(additions);
    if (incrementVersion) {
      const update = await manager
        .getRepository(FinancialPayment)
        .createQueryBuilder()
        .update()
        .set({ version: () => 'version + 1' })
        .where('id = :id AND version = :version', {
          id: payment.id,
          version: payment.version,
        })
        .execute();
      if (update.affected !== 1) {
        throw new ConflictException('Payment was changed; reload and retry');
      }
    }
  }

  private parseMap(items: PaymentAllocationItemDto[]) {
    const result = new Map<string, number>();
    for (const item of items) {
      if (result.has(item.accrualId)) {
        throw new BadRequestException('Duplicate accrualId in allocations');
      }
      try {
        result.set(item.accrualId, parseRublesToMinor(item.amount));
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : 'Invalid money amount',
        );
      }
    }
    return result;
  }

  private async lockPayment(manager: EntityManager, id: string) {
    const payment = await manager.getRepository(FinancialPayment).findOne({
      where: { id },
      ...(manager.connection.options.type === 'postgres'
        ? { lock: { mode: 'pessimistic_write' as const } }
        : {}),
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  private async sumAccrual(manager: EntityManager, accrualId: string) {
    const raw = await manager
      .getRepository(FinancialAccrualEntry)
      .createQueryBuilder('entry')
      .select('COALESCE(SUM(entry.amountMinor), 0)', 'amount')
      .where('entry.accrualId = :accrualId', { accrualId })
      .getRawOne<{ amount: string | number }>();
    const amount = Number(raw?.amount ?? 0);
    assertSafeMinorAmount(amount);
    return amount;
  }
}
