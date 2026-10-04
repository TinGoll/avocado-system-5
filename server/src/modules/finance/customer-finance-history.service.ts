import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { OrderGroup } from '../order-groups/entities/order-group.entity';
import {
  CustomerFinanceHistoryQueryDto,
  CustomerFinanceHistoryType,
} from './dto/finance-read.dto';
import { FinancialAccrualEntry } from './entities/financial-accrual-entry.entity';
import {
  FinancialAccrual,
  FinancialAccrualSourceType,
} from './entities/financial-accrual.entity';
import { FinancialAllocationBatch } from './entities/financial-allocation-batch.entity';
import { FinancialPaymentAllocation } from './entities/financial-payment-allocation.entity';
import { FinancialPayment } from './entities/financial-payment.entity';
import { formatMinorToRubles } from './finance-money';

type HistoryCursor = { createdAt: string; rank: number; id: string };
type HistoryDetail = {
  orderGroupId: number | null;
  orderNumber: string | null;
  amount: string;
};
type HistoryItem = {
  id: string;
  operationId: number | null;
  createdAt: string;
  type: CustomerFinanceHistoryType;
  amount: string;
  description: string;
  comment: string | null;
  employee: string | null;
  details: HistoryDetail[];
  rank: number;
};

const TYPE_RANK: Record<CustomerFinanceHistoryType, number> = {
  [CustomerFinanceHistoryType.PAYMENT]: 60,
  [CustomerFinanceHistoryType.ALLOCATION]: 50,
  [CustomerFinanceHistoryType.PAYMENT_CANCELLATION]: 40,
  [CustomerFinanceHistoryType.ALLOCATION_RELEASE]: 30,
  [CustomerFinanceHistoryType.ADJUSTMENT]: 20,
  [CustomerFinanceHistoryType.REVERSAL]: 10,
};

@Injectable()
export class CustomerFinanceHistoryService {
  constructor(private readonly source: DataSource) {}

  async getHistory(customerId: string, query: CustomerFinanceHistoryQueryDto) {
    const customer = await this.source.getRepository(Customer).findOne({
      where: { id: customerId },
      select: { id: true, name: true, companyName: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;
    const selected = new Set(
      query.types?.length
        ? query.types
        : Object.values(CustomerFinanceHistoryType),
    );
    const loaders: Array<Promise<HistoryItem[]>> = [];
    if (selected.has(CustomerFinanceHistoryType.PAYMENT))
      loaders.push(this.loadPayments(customerId, query.limit, cursor));
    if (selected.has(CustomerFinanceHistoryType.ALLOCATION)) {
      loaders.push(this.loadBatches(customerId, query.limit, cursor));
      loaders.push(this.loadLegacyAllocations(customerId, query.limit, cursor));
    }
    if (selected.has(CustomerFinanceHistoryType.PAYMENT_CANCELLATION))
      loaders.push(
        this.loadPaymentCancellations(customerId, query.limit, cursor),
      );
    if (selected.has(CustomerFinanceHistoryType.ALLOCATION_RELEASE))
      loaders.push(
        this.loadReleasedAllocations(customerId, query.limit, cursor),
      );
    if (selected.has(CustomerFinanceHistoryType.ADJUSTMENT))
      loaders.push(
        this.loadAccrualEntries(
          customerId,
          query.limit,
          cursor,
          CustomerFinanceHistoryType.ADJUSTMENT,
        ),
      );
    if (selected.has(CustomerFinanceHistoryType.REVERSAL))
      loaders.push(
        this.loadAccrualEntries(
          customerId,
          query.limit,
          cursor,
          CustomerFinanceHistoryType.REVERSAL,
        ),
      );

    const rows = (await Promise.all(loaders))
      .flat()
      .sort((left, right) => this.compare(left, right));
    const hasMore = rows.length > query.limit;
    const items = rows.slice(0, query.limit);
    const last = items.at(-1);
    return {
      customer: {
        id: customer.id,
        name: customer.name,
        companyName: customer.companyName ?? null,
      },
      items: items.map((item) => ({
        id: item.id,
        operationId: item.operationId,
        createdAt: item.createdAt,
        type: item.type,
        amount: item.amount,
        description: item.description,
        comment: item.comment,
        employee: item.employee,
        details: item.details,
      })),
      meta: {
        limit: query.limit,
        nextCursor:
          hasMore && last
            ? this.encodeCursor({
                createdAt: last.createdAt,
                rank: last.rank,
                id: last.id,
              })
            : null,
      },
    };
  }

  private async loadPayments(
    customerId: string,
    limit: number,
    cursor: HistoryCursor | null,
  ) {
    const type = CustomerFinanceHistoryType.PAYMENT;
    const qb = this.source
      .getRepository(FinancialPayment)
      .createQueryBuilder('payment')
      .select('payment.id', 'id')
      .addSelect('payment.createdAt', 'createdAt')
      .addSelect('payment.amountMinor', 'amount')
      .addSelect('payment.externalReference', 'reference')
      .addSelect('payment.comment', 'comment')
      .where('payment.customerId = :customerId', { customerId });
    this.applyCursor(qb, 'payment.createdAt', 'payment.id', type, cursor);
    const rows = await this.loadRows(
      qb,
      'payment.createdAt',
      'payment.id',
      limit,
    );
    return rows.map((row) =>
      this.item(row, type, {
        description: this.string(row.reference) ?? 'Внесение оплаты',
        comment: this.string(row.comment),
      }),
    );
  }

  private async loadPaymentCancellations(
    customerId: string,
    limit: number,
    cursor: HistoryCursor | null,
  ) {
    const type = CustomerFinanceHistoryType.PAYMENT_CANCELLATION;
    const qb = this.source
      .getRepository(FinancialPayment)
      .createQueryBuilder('payment')
      .select('payment.id', 'id')
      .addSelect('payment.cancelledAt', 'createdAt')
      .addSelect('-payment.amountMinor', 'amount')
      .addSelect('payment.externalReference', 'reference')
      .addSelect('payment.cancellationReason', 'comment')
      .where('payment.customerId = :customerId', { customerId })
      .andWhere('payment.cancelledAt IS NOT NULL');
    this.applyCursor(qb, 'payment.cancelledAt', 'payment.id', type, cursor);
    const rows = await this.loadRows(
      qb,
      'payment.cancelledAt',
      'payment.id',
      limit,
    );
    return rows.map((row) =>
      this.item(row, type, {
        description: `Аннулирование оплаты${this.string(row.reference) ? ` ${this.string(row.reference)}` : ''}`,
        comment: this.string(row.comment),
      }),
    );
  }

  private async loadBatches(
    customerId: string,
    limit: number,
    cursor: HistoryCursor | null,
  ) {
    const type = CustomerFinanceHistoryType.ALLOCATION;
    const qb = this.source
      .getRepository(FinancialAllocationBatch)
      .createQueryBuilder('batch')
      .select('batch.id', 'id')
      .addSelect('batch.createdAt', 'createdAt')
      .addSelect('batch.totalMinor', 'amount')
      .addSelect('batch.comment', 'comment')
      .addSelect('batch.authorName', 'employee')
      .addSelect('batch.resultSnapshot', 'details')
      .where('batch.customerId = :customerId', { customerId });
    this.applyCursor(qb, 'batch.createdAt', 'batch.id', type, cursor);
    const rows = await this.loadRows(qb, 'batch.createdAt', 'batch.id', limit);
    return rows.map((row) => {
      const operationId = Number(row.id);
      const snapshot = this.json<Array<Record<string, unknown>>>(row.details);
      return this.item(row, type, {
        operationId,
        description: `Распределение №${operationId}`,
        comment: this.string(row.comment),
        employee: this.string(row.employee),
        details: snapshot.map((line) => ({
          orderGroupId: Number(line.orderGroupId),
          orderNumber: this.string(line.orderNumber),
          amount: formatMinorToRubles(Number(line.allocatedMinor)),
        })),
      });
    });
  }

  private async loadLegacyAllocations(
    customerId: string,
    limit: number,
    cursor: HistoryCursor | null,
  ) {
    return this.loadAllocationRows(customerId, limit, cursor, false);
  }

  private async loadReleasedAllocations(
    customerId: string,
    limit: number,
    cursor: HistoryCursor | null,
  ) {
    return this.loadAllocationRows(customerId, limit, cursor, true);
  }

  private async loadAllocationRows(
    customerId: string,
    limit: number,
    cursor: HistoryCursor | null,
    released: boolean,
  ) {
    const type = released
      ? CustomerFinanceHistoryType.ALLOCATION_RELEASE
      : CustomerFinanceHistoryType.ALLOCATION;
    const dateColumn = released
      ? 'allocation.releasedAt'
      : 'allocation.createdAt';
    const qb = this.source
      .getRepository(FinancialPaymentAllocation)
      .createQueryBuilder('allocation')
      .innerJoin(
        FinancialPayment,
        'payment',
        'payment.id = allocation.paymentId',
      )
      .innerJoin(
        FinancialAccrual,
        'accrual',
        'accrual.id = allocation.accrualId',
      )
      .leftJoin(
        OrderGroup,
        'orderGroup',
        'orderGroup.id = accrual.orderGroupId',
      )
      .select('allocation.id', 'id')
      .addSelect(dateColumn, 'createdAt')
      .addSelect(
        released ? '-allocation.amountMinor' : 'allocation.amountMinor',
        'amount',
      )
      .addSelect('allocation.releaseReason', 'comment')
      .addSelect('accrual.orderGroupId', 'orderGroupId')
      .addSelect('orderGroup.orderNumber', 'orderNumber')
      .where('payment.customerId = :customerId', { customerId });
    if (released) qb.andWhere('allocation.releasedAt IS NOT NULL');
    else qb.andWhere('allocation.batchId IS NULL');
    this.applyCursor(qb, dateColumn, 'allocation.id', type, cursor);
    const rows = await this.loadRows(qb, dateColumn, 'allocation.id', limit);
    return rows.map((row) =>
      this.item(row, type, {
        description: released
          ? `Снятие распределения${this.string(row.orderNumber) ? ` с заказа ${this.string(row.orderNumber)}` : ''}`
          : `Распределение${this.string(row.orderNumber) ? ` на заказ ${this.string(row.orderNumber)}` : ''}`,
        comment: this.string(row.comment),
        details: [
          {
            orderGroupId:
              row.orderGroupId == null ? null : Number(row.orderGroupId),
            orderNumber: this.string(row.orderNumber),
            amount: formatMinorToRubles(Math.abs(Number(row.amount))),
          },
        ],
      }),
    );
  }

  private async loadAccrualEntries(
    customerId: string,
    limit: number,
    cursor: HistoryCursor | null,
    type:
      | CustomerFinanceHistoryType.ADJUSTMENT
      | CustomerFinanceHistoryType.REVERSAL,
  ) {
    const qb = this.source
      .getRepository(FinancialAccrualEntry)
      .createQueryBuilder('entry')
      .innerJoin(FinancialAccrual, 'accrual', 'accrual.id = entry.accrualId')
      .leftJoin(
        OrderGroup,
        'orderGroup',
        'orderGroup.id = accrual.orderGroupId',
      )
      .select('entry.id', 'id')
      .addSelect('entry.createdAt', 'createdAt')
      .addSelect('entry.amountMinor', 'amount')
      .addSelect('entry.reason', 'comment')
      .addSelect('accrual.title', 'title')
      .addSelect('accrual.orderGroupId', 'orderGroupId')
      .addSelect('orderGroup.orderNumber', 'orderNumber')
      .where('accrual.customerId = :customerId', { customerId });
    if (type === CustomerFinanceHistoryType.REVERSAL)
      qb.andWhere('entry.kind = :kind', { kind: 'reversal' });
    else
      qb.andWhere(
        "entry.kind = 'adjustment' OR (entry.kind = 'initial' AND accrual.sourceType = :manual)",
        { manual: FinancialAccrualSourceType.MANUAL },
      );
    this.applyCursor(qb, 'entry.createdAt', 'entry.id', type, cursor);
    const rows = await this.loadRows(qb, 'entry.createdAt', 'entry.id', limit);
    return rows.map((row) =>
      this.item(row, type, {
        description:
          type === CustomerFinanceHistoryType.REVERSAL
            ? `Аннулирование начисления «${String(row.title)}»`
            : `Ручная корректировка «${String(row.title)}»`,
        comment: this.string(row.comment),
        details:
          row.orderGroupId == null
            ? []
            : [
                {
                  orderGroupId: Number(row.orderGroupId),
                  orderNumber: this.string(row.orderNumber),
                  amount: formatMinorToRubles(Number(row.amount)),
                },
              ],
      }),
    );
  }

  private applyCursor<Entity extends object>(
    qb: SelectQueryBuilder<Entity>,
    dateColumn: string,
    idColumn: string,
    type: CustomerFinanceHistoryType,
    cursor: HistoryCursor | null,
  ) {
    if (!cursor) return;
    const rank = TYPE_RANK[type];
    if (rank > cursor.rank) qb.andWhere(`${dateColumn} < :cursorDate`);
    else if (rank < cursor.rank) qb.andWhere(`${dateColumn} <= :cursorDate`);
    else
      qb.andWhere(
        `(${dateColumn} < :cursorDate OR (${dateColumn} = :cursorDate AND ${idColumn} < :cursorId))`,
      );
    qb.setParameters({
      cursorDate: this.cursorDate(cursor.createdAt),
      cursorId: cursor.id,
    });
  }

  private loadRows<Entity extends object>(
    qb: SelectQueryBuilder<Entity>,
    dateColumn: string,
    idColumn: string,
    limit: number,
  ) {
    return qb
      .orderBy(dateColumn, 'DESC')
      .addOrderBy(idColumn, 'DESC')
      .take(limit + 1)
      .getRawMany<Record<string, unknown>>();
  }

  private item(
    row: Record<string, unknown>,
    type: CustomerFinanceHistoryType,
    overrides: Partial<HistoryItem>,
  ): HistoryItem {
    return {
      id: String(row.id),
      operationId: null,
      createdAt: this.iso(row.createdAt),
      type,
      amount: formatMinorToRubles(Number(row.amount)),
      description: '',
      comment: null,
      employee: null,
      details: [],
      rank: TYPE_RANK[type],
      ...overrides,
    };
  }

  private compare(left: HistoryItem, right: HistoryItem) {
    return (
      right.createdAt.localeCompare(left.createdAt) ||
      right.rank - left.rank ||
      right.id.localeCompare(left.id)
    );
  }

  private encodeCursor(cursor: HistoryCursor) {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
  }

  private decodeCursor(value: string): HistoryCursor {
    try {
      const parsed = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      ) as Partial<HistoryCursor>;
      if (
        typeof parsed.createdAt !== 'string' ||
        !Number.isFinite(Date.parse(parsed.createdAt)) ||
        !Number.isInteger(parsed.rank) ||
        typeof parsed.id !== 'string' ||
        !parsed.id
      )
        throw new Error();
      return parsed as HistoryCursor;
    } catch {
      throw new BadRequestException('Invalid customer finance history cursor');
    }
  }

  private iso(value: unknown) {
    const raw = String(value);
    const date =
      value instanceof Date
        ? value
        : new Date(
            (this.source.options.type === 'sqlite' ||
              this.source.options.type === 'better-sqlite3') &&
            /^\d{4}-\d{2}-\d{2} /.test(raw)
              ? `${raw.replace(' ', 'T')}Z`
              : raw,
          );
    if (!Number.isFinite(date.getTime()))
      throw new BadRequestException('Invalid finance history date');
    return date.toISOString();
  }

  private cursorDate(value: string) {
    if (
      this.source.options.type !== 'sqlite' &&
      this.source.options.type !== 'better-sqlite3'
    )
      return new Date(value);
    return value.replace('T', ' ').replace('Z', '');
  }

  private string(value: unknown) {
    return typeof value === 'string' && value ? value : null;
  }

  private json<T>(value: unknown): T {
    return (typeof value === 'string' ? JSON.parse(value) : value) as T;
  }
}
