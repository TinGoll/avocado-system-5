import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { runDatabaseTransaction } from '../database/database-transaction';
import { CancelPaymentDto, CreatePaymentDto } from './dto/payment.dto';
import {
  FinancialPaymentAllocation,
  FinancialPaymentAllocationStatus,
} from './entities/financial-payment-allocation.entity';
import {
  FinancialPayment,
  FinancialPaymentMethod,
  FinancialPaymentStatus,
} from './entities/financial-payment.entity';
import { formatMinorToRubles, parseRublesToMinor } from './finance-money';
import {
  FinanceAllocationsService,
  FinancialPaymentAllocationView,
} from './finance-allocations.service';

export type FinancialPaymentView = {
  id: string;
  customerId: string;
  amountMinor: number;
  amount: string;
  paymentDate: string;
  method: FinancialPaymentMethod;
  externalReference: string | null;
  comment: string | null;
  status: FinancialPaymentStatus;
  version: number;
  cancellationDate: string | null;
  cancellationReason: string | null;
  reportOperations: Array<{
    kind: 'payment' | 'cancellation';
    effectiveDate: string;
    amountMinor: number;
    amount: string;
  }>;
  allocations: FinancialPaymentAllocationView[];
  allocatedMinor: number;
  allocated: string;
  unallocatedMinor: number;
  unallocated: string;
};

@Injectable()
export class FinancePaymentsService {
  constructor(
    private readonly source: DataSource,
    @InjectRepository(FinancialPayment)
    private readonly payments: Repository<FinancialPayment>,
    private readonly allocations: FinanceAllocationsService,
  ) {}

  async create(dto: CreatePaymentDto): Promise<FinancialPaymentView> {
    const amountMinor = this.parsePositive(dto.amount);
    const replay = await this.payments.findOne({
      where: [
        { requestId: dto.requestId },
        { cancellationRequestId: dto.requestId },
      ],
    });
    if (replay) {
      if (replay.cancellationRequestId === dto.requestId) {
        throw new ConflictException('requestId was already used');
      }
      this.assertCreateReplay(replay, dto, amountMinor);
      await this.assertAllocationReplay(replay, dto);
      return this.read(replay);
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
        const payment = await manager.getRepository(FinancialPayment).save({
          customerId: dto.customerId,
          amountMinor,
          paymentDate: dto.paymentDate,
          method: dto.method,
          externalReference: dto.externalReference ?? null,
          comment: dto.comment ?? null,
          status: FinancialPaymentStatus.POSTED,
          version: 0,
          requestId: dto.requestId,
          cancellationRequestId: null,
          cancelledAt: null,
          cancellationDate: null,
          cancellationReason: null,
        });
        await this.allocations.createInitial(
          manager,
          payment,
          dto.allocations ?? [],
        );
        return this.read(payment, manager);
      });
    } catch (error) {
      if (error instanceof QueryFailedError) {
        const existing = await this.payments.findOneBy({
          requestId: dto.requestId,
        });
        if (existing) {
          this.assertCreateReplay(existing, dto, amountMinor);
          await this.assertAllocationReplay(existing, dto);
          return this.read(existing);
        }
        throw new ConflictException('Payment conflicts with existing data');
      }
      throw error;
    }
  }

  async findOne(id: string): Promise<FinancialPaymentView> {
    const payment = await this.payments.findOneBy({ id });
    if (!payment) throw new NotFoundException('Payment not found');
    return this.read(payment);
  }

  async cancel(
    id: string,
    dto: CancelPaymentDto,
  ): Promise<FinancialPaymentView> {
    return runDatabaseTransaction(this.source, async (manager) => {
      const repository = manager.getRepository(FinancialPayment);
      const replay = await repository.findOneBy({
        cancellationRequestId: dto.requestId,
      });
      if (replay) {
        if (
          replay.id === id &&
          replay.cancellationDate === dto.cancellationDate &&
          replay.cancellationReason === dto.reason
        ) {
          return this.read(replay, manager);
        }
        throw new ConflictException(
          'requestId was already used with different command data',
        );
      }
      const payment = await repository.findOne({
        where: { id },
        ...(manager.connection.options.type === 'postgres'
          ? { lock: { mode: 'pessimistic_write' as const } }
          : {}),
      });
      if (!payment) throw new NotFoundException('Payment not found');
      if (payment.status === FinancialPaymentStatus.CANCELLED) {
        if (
          payment.cancellationRequestId === dto.requestId &&
          payment.cancellationDate === dto.cancellationDate &&
          payment.cancellationReason === dto.reason
        )
          return this.read(payment, manager);
        throw new ConflictException('Payment is already cancelled');
      }
      if (payment.version !== dto.expectedVersion) {
        throw new ConflictException('Payment was changed; reload and retry');
      }
      const requestOwner = await repository.findOne({
        where: [
          { requestId: dto.requestId },
          { cancellationRequestId: dto.requestId },
        ],
      });
      if (requestOwner) {
        throw new ConflictException('requestId was already used');
      }

      const update = await repository
        .createQueryBuilder()
        .update()
        .set({
          status: FinancialPaymentStatus.CANCELLED,
          version: () => 'version + 1',
          cancelledAt: new Date(),
          cancellationDate: dto.cancellationDate,
          cancellationReason: dto.reason,
          cancellationRequestId: dto.requestId,
        })
        .where('id = :id AND version = :expectedVersion', {
          id,
          expectedVersion: dto.expectedVersion,
        })
        .execute();
      if (update.affected !== 1) {
        throw new ConflictException('Payment was changed; reload and retry');
      }
      await manager
        .getRepository(FinancialPaymentAllocation)
        .createQueryBuilder()
        .update()
        .set({
          status: FinancialPaymentAllocationStatus.RELEASED,
          releasedAt: new Date(),
          releaseReason: dto.reason,
        })
        .where('paymentId = :id AND status = :status', {
          id,
          status: FinancialPaymentAllocationStatus.ACTIVE,
        })
        .execute();
      payment.status = FinancialPaymentStatus.CANCELLED;
      payment.version += 1;
      payment.cancellationRequestId = dto.requestId;
      payment.cancellationDate = dto.cancellationDate;
      payment.cancellationReason = dto.reason;
      return this.read(payment, manager);
    });
  }

  private assertCreateReplay(
    payment: FinancialPayment,
    dto: CreatePaymentDto,
    amountMinor: number,
  ) {
    if (
      payment.customerId !== dto.customerId ||
      payment.amountMinor !== amountMinor ||
      payment.paymentDate !== dto.paymentDate ||
      payment.method !== dto.method ||
      payment.externalReference !== (dto.externalReference ?? null) ||
      payment.comment !== (dto.comment ?? null)
    ) {
      throw new ConflictException(
        'requestId was already used with different command data',
      );
    }
  }

  private async assertAllocationReplay(
    payment: FinancialPayment,
    dto: CreatePaymentDto,
  ) {
    const detail = await this.allocations.read(payment.id);
    const actual = detail.allocations
      .filter((row) => row.status === FinancialPaymentAllocationStatus.ACTIVE)
      .map((row) => `${row.accrualId}:${row.amountMinor}`)
      .sort();
    const expected = (dto.allocations ?? [])
      .map((row) => `${row.accrualId}:${this.parsePositive(row.amount)}`)
      .sort();
    if (
      actual.length !== expected.length ||
      actual.some((row, index) => row !== expected[index])
    ) {
      throw new ConflictException(
        'requestId was already used with different command data',
      );
    }
  }

  private async read(
    payment: FinancialPayment,
    manager = this.source.manager,
  ): Promise<FinancialPaymentView> {
    const reportOperations: FinancialPaymentView['reportOperations'] = [
      {
        kind: 'payment',
        effectiveDate: payment.paymentDate,
        amountMinor: payment.amountMinor,
        amount: formatMinorToRubles(payment.amountMinor),
      },
    ];
    if (
      payment.status === FinancialPaymentStatus.CANCELLED &&
      payment.cancellationDate
    ) {
      reportOperations.push({
        kind: 'cancellation',
        effectiveDate: payment.cancellationDate,
        amountMinor: -payment.amountMinor,
        amount: formatMinorToRubles(-payment.amountMinor),
      });
    }
    const allocationDetail = await this.allocations.read(payment.id, manager);
    const unallocatedMinor =
      payment.amountMinor - allocationDetail.allocatedMinor;
    return {
      id: payment.id,
      customerId: payment.customerId,
      amountMinor: payment.amountMinor,
      amount: formatMinorToRubles(payment.amountMinor),
      paymentDate: payment.paymentDate,
      method: payment.method,
      externalReference: payment.externalReference,
      comment: payment.comment,
      status: payment.status,
      version: payment.version,
      cancellationDate: payment.cancellationDate,
      cancellationReason: payment.cancellationReason,
      reportOperations,
      ...allocationDetail,
      unallocatedMinor,
      unallocated: formatMinorToRubles(unallocatedMinor),
    };
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
}
