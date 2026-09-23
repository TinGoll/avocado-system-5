import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import { OrderGroup } from '../order-groups/entities/order-group.entity';
import { Order } from '../orders/entities/order.entity';
import {
  AccrualListQueryDto,
  AccrualPaymentState,
  FinanceListQueryDto,
  PaymentAllocationState,
  PaymentListQueryDto,
} from './dto/finance-read.dto';
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

type Cursor = { businessDate: string; id: string };
type MoneyTotals = {
  accruedMinor: number;
  paidMinor: number;
  balanceMinor: number;
  debtMinor: number;
  advanceMinor: number;
  allocatedMinor: number;
  unallocatedMinor: number;
};

@Injectable()
export class FinanceReportsService {
  constructor(private readonly source: DataSource) {}

  async getSummary() {
    const [customerRows, allocatedRow, linkIssues] = await Promise.all([
      this.customerBalances(),
      this.activeAllocated(),
      this.source
        .getRepository(OrderGroup)
        .createQueryBuilder('order_group')
        .where('order_group.customerId IS NULL')
        .getCount(),
    ]);
    return {
      ...this.moneyView(this.aggregateBalances(customerRows, allocatedRow)),
      customerLinkIssuesCount: linkIssues,
    };
  }

  async getCustomer(customerId: string) {
    const customer = await this.source
      .getRepository(Customer)
      .findOneBy({ id: customerId });
    if (!customer) throw new NotFoundException('Customer not found');
    const [balances, allocatedRow, accruals, recentOperations] =
      await Promise.all([
        this.customerBalances(customerId),
        this.activeAllocated(customerId),
        this.listAccruals({ customerId, limit: 10 }),
        this.recentCustomerOperations(customerId),
      ]);
    const totals = this.aggregateBalances(balances, allocatedRow);
    const openAccruals = accruals.items.filter(
      (item) =>
        item.state !== AccrualPaymentState.PAID &&
        item.state !== AccrualPaymentState.CANCELLED,
    );
    return {
      customer: {
        id: customer.id,
        name: customer.name,
        companyName: customer.companyName ?? null,
      },
      ...this.moneyView(totals),
      recentOperations,
      openAccruals,
    };
  }

  async listCustomers(search?: string) {
    const [rows, allocations] = await Promise.all([
      this.customerBalances(),
      this.customerAllocations(),
    ]);
    const allocationByCustomer = new Map(
      allocations.map((row) => [row.customerId, this.number(row.amount)]),
    );
    const term = search?.trim().toLocaleLowerCase('ru-RU');
    const customers = await this.source.getRepository(Customer).find({
      select: { id: true, name: true, companyName: true },
      order: { name: 'ASC', id: 'ASC' },
    });
    const balanceByCustomer = new Map(rows.map((row) => [row.customerId, row]));
    const items = customers
      .filter((customer) =>
        term
          ? `${customer.name} ${customer.companyName ?? ''}`
              .toLocaleLowerCase('ru-RU')
              .includes(term)
          : true,
      )
      .map((customer) => {
        const row = balanceByCustomer.get(customer.id);
        const accruedMinor = this.number(row?.accrued);
        const paidMinor = this.number(row?.paid);
        const allocatedMinor = allocationByCustomer.get(customer.id) ?? 0;
        return {
          id: customer.id,
          name: customer.name,
          companyName: customer.companyName ?? null,
          ...this.moneyFields('debt', Math.max(accruedMinor - paidMinor, 0)),
          ...this.moneyFields('advance', Math.max(paidMinor - accruedMinor, 0)),
          ...this.moneyFields(
            'unallocated',
            Math.max(paidMinor - allocatedMinor, 0),
          ),
        };
      });
    return { items, meta: { count: items.length } };
  }

  async getOrderGroup(orderGroupId: number) {
    const group = await this.source
      .getRepository(OrderGroup)
      .findOneBy({ id: orderGroupId });
    if (!group) throw new NotFoundException('Order group not found');
    const [orders, accrualRow, allocatedRow, customerRows, customerAllocated] =
      await Promise.all([
        this.source.getRepository(Order).find({
          where: { orderGroup: { id: orderGroupId } },
          select: { id: true, totalPrice: true },
        }),
        this.accrualAggregate(orderGroupId),
        this.orderAllocated(orderGroupId),
        group.customerId
          ? this.customerBalances(group.customerId)
          : Promise.resolve([]),
        group.customerId
          ? this.activeAllocated(group.customerId)
          : Promise.resolve({ amount: 0 }),
      ]);
    const orderTotalMinor = orders.reduce(
      (sum, order) =>
        sum +
        parseRublesToMinor(Number(order.totalPrice).toFixed(2), {
          allowNegative: true,
          allowZero: true,
        }),
      0,
    );
    const accruedMinor = this.number(accrualRow?.amount);
    const allocatedMinor = this.number(allocatedRow?.amount);
    const customerTotals = this.aggregateBalances(
      customerRows,
      customerAllocated,
    );
    return {
      orderGroup: {
        id: group.id,
        orderNumber: group.orderNumber,
        customerId: group.customerId,
      },
      ...this.moneyFields('orderTotal', orderTotalMinor),
      ...this.moneyFields('accrued', accruedMinor),
      ...this.moneyFields('allocated', allocatedMinor),
      ...this.moneyFields(
        'remaining',
        Math.max(accruedMinor - allocatedMinor, 0),
      ),
      ...this.moneyFields('syncDifference', orderTotalMinor - accruedMinor),
      ...this.moneyFields(
        'customerUnallocatedAdvance',
        customerTotals.unallocatedMinor,
      ),
      accrualId: accrualRow?.id ?? null,
      accrualStatus: accrualRow?.status ?? null,
    };
  }

  async listAccruals(query: AccrualListQueryDto) {
    const entryTotals = this.source
      .getRepository(FinancialAccrualEntry)
      .createQueryBuilder('entry')
      .select('entry.accrualId', 'accrual_id')
      .addSelect('SUM(entry.amountMinor)', 'amount')
      .addSelect('MIN(entry.effectiveDate)', 'business_date')
      .groupBy('entry.accrualId');
    const allocationTotals = this.source
      .getRepository(FinancialPaymentAllocation)
      .createQueryBuilder('allocation')
      .select('allocation.accrualId', 'accrual_id')
      .addSelect('SUM(allocation.amountMinor)', 'allocated')
      .where('allocation.status = :activeAllocation', {
        activeAllocation: FinancialPaymentAllocationStatus.ACTIVE,
      })
      .groupBy('allocation.accrualId');
    const qb = this.source
      .getRepository(FinancialAccrual)
      .createQueryBuilder('accrual')
      .innerJoin(
        `(${entryTotals.getQuery()})`,
        'entry_total',
        'entry_total.accrual_id = accrual.id',
      )
      .leftJoin(
        `(${allocationTotals.getQuery()})`,
        'allocation_total',
        'allocation_total.accrual_id = accrual.id',
      )
      .innerJoin(Customer, 'customer', 'customer.id = accrual.customerId')
      .leftJoin(
        OrderGroup,
        'order_group',
        'order_group.id = accrual.orderGroupId',
      )
      .setParameters({
        ...entryTotals.getParameters(),
        ...allocationTotals.getParameters(),
      })
      .select([
        'accrual.id AS id',
        'accrual.customerId AS "customerId"',
        'customer.name AS "customerName"',
        'accrual.sourceType AS "sourceType"',
        'accrual.orderGroupId AS "orderGroupId"',
        'order_group.orderNumber AS "orderNumber"',
        'accrual.title AS title',
        'accrual.status AS status',
        'accrual.version AS version',
        'entry_total.business_date AS "businessDate"',
        'entry_total.amount AS amount',
        'COALESCE(allocation_total.allocated, 0) AS allocated',
      ]);
    this.applyCommonFilters(
      qb,
      query,
      'entry_total.business_date',
      'accrual',
      `customer.name || ' ' || accrual.title || ' ' || COALESCE(order_group.orderNumber, '') || ' ' || COALESCE(order_group.comment, '')`,
    );
    if (query.sourceType)
      qb.andWhere('accrual.sourceType = :sourceType', {
        sourceType: query.sourceType,
      });
    this.applyAccrualState(qb, query.status);
    const rows = await qb
      .orderBy('entry_total.business_date', 'DESC')
      .addOrderBy('accrual.id', 'DESC')
      .take(query.limit + 1)
      .getRawMany<Record<string, unknown>>();
    return this.page(rows, query.limit, (row) => this.accrualListView(row));
  }

  async listPayments(query: PaymentListQueryDto) {
    const allocationTotals = this.source
      .getRepository(FinancialPaymentAllocation)
      .createQueryBuilder('allocation')
      .select('allocation.paymentId', 'payment_id')
      .addSelect('SUM(allocation.amountMinor)', 'allocated')
      .where('allocation.status = :activeAllocation', {
        activeAllocation: FinancialPaymentAllocationStatus.ACTIVE,
      })
      .groupBy('allocation.paymentId');
    const qb = this.source
      .getRepository(FinancialPayment)
      .createQueryBuilder('payment')
      .innerJoin(Customer, 'customer', 'customer.id = payment.customerId')
      .leftJoin(
        `(${allocationTotals.getQuery()})`,
        'allocation_total',
        'allocation_total.payment_id = payment.id',
      )
      .setParameters(allocationTotals.getParameters())
      .select([
        'payment.id AS id',
        'payment.customerId AS "customerId"',
        'customer.name AS "customerName"',
        'payment.amountMinor AS amount',
        'payment.paymentDate AS "businessDate"',
        'payment.method AS method',
        'payment.externalReference AS "externalReference"',
        'payment.comment AS comment',
        'payment.status AS status',
        'payment.version AS version',
        'COALESCE(allocation_total.allocated, 0) AS allocated',
      ]);
    this.applyCommonFilters(
      qb,
      query,
      'payment.paymentDate',
      'payment',
      `customer.name || ' ' || COALESCE(payment.externalReference, '') || ' ' || COALESCE(payment.comment, '')`,
    );
    if (query.method)
      qb.andWhere('payment.method = :method', { method: query.method });
    if (query.status)
      qb.andWhere('payment.status = :paymentStatus', {
        paymentStatus: query.status,
      });
    this.applyAllocationState(qb, query.allocationState);
    const rows = await qb
      .orderBy('payment.paymentDate', 'DESC')
      .addOrderBy('payment.id', 'DESC')
      .take(query.limit + 1)
      .getRawMany<Record<string, unknown>>();
    return this.page(rows, query.limit, (row) => this.paymentListView(row));
  }

  private async customerBalances(customerId?: string) {
    const accruals = this.source
      .getRepository(FinancialAccrualEntry)
      .createQueryBuilder('entry')
      .innerJoin(FinancialAccrual, 'accrual', 'accrual.id = entry.accrualId')
      .select('accrual.customerId', 'customer_id')
      .addSelect('SUM(entry.amountMinor)', 'accrued')
      .groupBy('accrual.customerId');
    const payments = this.source
      .getRepository(FinancialPayment)
      .createQueryBuilder('payment')
      .select('payment.customerId', 'customer_id')
      .addSelect('SUM(payment.amountMinor)', 'paid')
      .where('payment.status = :posted', {
        posted: FinancialPaymentStatus.POSTED,
      })
      .groupBy('payment.customerId');
    const qb = this.source
      .getRepository(Customer)
      .createQueryBuilder('customer')
      .leftJoin(`(${accruals.getQuery()})`, 'a', 'a.customer_id = customer.id')
      .leftJoin(`(${payments.getQuery()})`, 'p', 'p.customer_id = customer.id')
      .setParameters({
        ...accruals.getParameters(),
        ...payments.getParameters(),
      })
      .select('customer.id', 'customerId')
      .addSelect('COALESCE(a.accrued, 0)', 'accrued')
      .addSelect('COALESCE(p.paid, 0)', 'paid');
    if (customerId) qb.where('customer.id = :customerId', { customerId });
    return qb.getRawMany<{
      customerId: string;
      accrued: string | number;
      paid: string | number;
    }>();
  }

  private activeAllocated(customerId?: string) {
    const qb = this.source
      .getRepository(FinancialPaymentAllocation)
      .createQueryBuilder('allocation')
      .innerJoin(
        FinancialPayment,
        'payment',
        'payment.id = allocation.paymentId',
      )
      .select('COALESCE(SUM(allocation.amountMinor), 0)', 'amount')
      .where('allocation.status = :active', {
        active: FinancialPaymentAllocationStatus.ACTIVE,
      })
      .andWhere('payment.status = :posted', {
        posted: FinancialPaymentStatus.POSTED,
      });
    if (customerId)
      qb.andWhere('payment.customerId = :customerId', { customerId });
    return qb
      .getRawOne<{ amount: string | number }>()
      .then((row) => row ?? { amount: 0 });
  }

  private customerAllocations() {
    return this.source
      .getRepository(FinancialPaymentAllocation)
      .createQueryBuilder('allocation')
      .innerJoin(
        FinancialPayment,
        'payment',
        'payment.id = allocation.paymentId',
      )
      .select('payment.customerId', 'customerId')
      .addSelect('SUM(allocation.amountMinor)', 'amount')
      .where('allocation.status = :active', {
        active: FinancialPaymentAllocationStatus.ACTIVE,
      })
      .andWhere('payment.status = :posted', {
        posted: FinancialPaymentStatus.POSTED,
      })
      .groupBy('payment.customerId')
      .getRawMany<{ customerId: string; amount: string | number }>();
  }

  private async recentCustomerOperations(customerId: string) {
    const [entries, payments] = await Promise.all([
      this.source
        .getRepository(FinancialAccrualEntry)
        .createQueryBuilder('entry')
        .innerJoin(FinancialAccrual, 'accrual', 'accrual.id = entry.accrualId')
        .select('entry.id', 'id')
        .addSelect('entry.effectiveDate', 'businessDate')
        .addSelect('entry.amountMinor', 'amount')
        .addSelect('entry.kind', 'entryKind')
        .addSelect('accrual.title', 'title')
        .where('accrual.customerId = :customerId', { customerId })
        .orderBy('entry.effectiveDate', 'DESC')
        .addOrderBy('entry.id', 'DESC')
        .take(10)
        .getRawMany<Record<string, unknown>>(),
      this.source
        .getRepository(FinancialPayment)
        .createQueryBuilder('payment')
        .select('payment.id', 'id')
        .addSelect('payment.paymentDate', 'paymentDate')
        .addSelect('payment.amountMinor', 'amount')
        .addSelect('payment.externalReference', 'externalReference')
        .addSelect('payment.comment', 'comment')
        .addSelect('payment.status', 'status')
        .addSelect('payment.cancellationDate', 'cancellationDate')
        .where('payment.customerId = :customerId', { customerId })
        .orderBy('payment.paymentDate', 'DESC')
        .addOrderBy('payment.id', 'DESC')
        .take(10)
        .getRawMany<Record<string, unknown>>(),
    ]);
    const result = [
      ...entries.map((row) =>
        this.operationView(
          `accrual_${String(row.entryKind)}`,
          String(row.businessDate),
          String(row.id),
          this.number(row.amount),
          String(row.title),
        ),
      ),
      ...payments.flatMap((row) => {
        const amountMinor = this.number(row.amount);
        const title =
          this.nullableString(row.externalReference) ??
          this.nullableString(row.comment) ??
          'Payment';
        const operations = [
          this.operationView(
            'payment',
            String(row.paymentDate),
            String(row.id),
            amountMinor,
            title,
          ),
        ];
        if (row.status === 'cancelled') {
          operations.push(
            this.operationView(
              'payment_cancellation',
              String(row.cancellationDate),
              String(row.id),
              -amountMinor,
              title,
            ),
          );
        }
        return operations;
      }),
    ];
    return result
      .sort(
        (a, b) =>
          b.businessDate.localeCompare(a.businessDate) ||
          b.id.localeCompare(a.id),
      )
      .slice(0, 10);
  }

  private operationView(
    kind: string,
    businessDate: string,
    id: string,
    amountMinor: number,
    title: string,
  ) {
    return {
      kind,
      businessDate,
      id,
      amountMinor,
      amount: formatMinorToRubles(amountMinor),
      title,
    };
  }

  private accrualAggregate(orderGroupId: number) {
    return this.source
      .getRepository(FinancialAccrual)
      .createQueryBuilder('accrual')
      .leftJoin(FinancialAccrualEntry, 'entry', 'entry.accrualId = accrual.id')
      .select('accrual.id', 'id')
      .addSelect('accrual.status', 'status')
      .addSelect('COALESCE(SUM(entry.amountMinor), 0)', 'amount')
      .where('accrual.orderGroupId = :orderGroupId', { orderGroupId })
      .groupBy('accrual.id')
      .addGroupBy('accrual.status')
      .getRawOne<{ id: string; status: string; amount: string | number }>();
  }
  private orderAllocated(orderGroupId: number) {
    return this.source
      .getRepository(FinancialPaymentAllocation)
      .createQueryBuilder('allocation')
      .innerJoin(
        FinancialAccrual,
        'accrual',
        'accrual.id = allocation.accrualId',
      )
      .select('COALESCE(SUM(allocation.amountMinor), 0)', 'amount')
      .where('accrual.orderGroupId = :orderGroupId', { orderGroupId })
      .andWhere('allocation.status = :active', {
        active: FinancialPaymentAllocationStatus.ACTIVE,
      })
      .getRawOne<{ amount: string | number }>()
      .then((row) => row ?? { amount: 0 });
  }

  private applyCommonFilters(
    qb: SelectQueryBuilder<ObjectLiteral>,
    query: FinanceListQueryDto,
    dateColumn: string,
    idAlias: string,
    searchText: string,
  ) {
    if (query.dateFrom)
      qb.andWhere(`${dateColumn} >= :dateFrom`, { dateFrom: query.dateFrom });
    if (query.dateTo)
      qb.andWhere(`${dateColumn} <= :dateTo`, { dateTo: query.dateTo });
    if (query.customerId)
      qb.andWhere(`${idAlias}.customerId = :customerId`, {
        customerId: query.customerId,
      });
    const cursor = query.cursor ? this.decodeCursor(query.cursor) : null;
    if (cursor)
      qb.andWhere(
        `(${dateColumn} < :cursorDate OR (${dateColumn} = :cursorDate AND ${idAlias}.id < :cursorId))`,
        { cursorDate: cursor.businessDate, cursorId: cursor.id },
      );
    const term = query.search?.trim().toLocaleLowerCase('ru-RU');
    if (term) {
      const normalize =
        this.source.options.type === 'postgres' ? 'lower' : 'unicode_lower';
      const operator =
        this.source.options.type === 'postgres' ? 'ILIKE' : 'LIKE';
      qb.andWhere(`${normalize}(${searchText}) ${operator} :search`, {
        search: `%${term}%`,
      });
    }
  }

  private applyAccrualState(
    qb: SelectQueryBuilder<ObjectLiteral>,
    state?: AccrualPaymentState,
  ) {
    if (!state) return;
    if (state === AccrualPaymentState.CANCELLED) {
      qb.andWhere('accrual.status = :cancelled', {
        cancelled: FinancialAccrualStatus.CANCELLED,
      });
      return;
    }
    qb.andWhere('accrual.status = :activeAccrual', {
      activeAccrual: FinancialAccrualStatus.ACTIVE,
    });
    if (state === AccrualPaymentState.UNPAID)
      qb.andWhere('COALESCE(allocation_total.allocated, 0) = 0');
    if (state === AccrualPaymentState.PARTIALLY_PAID)
      qb.andWhere(
        'COALESCE(allocation_total.allocated, 0) > 0 AND COALESCE(allocation_total.allocated, 0) < entry_total.amount',
      );
    if (state === AccrualPaymentState.PAID)
      qb.andWhere(
        'COALESCE(allocation_total.allocated, 0) >= entry_total.amount',
      );
  }

  private applyAllocationState(
    qb: SelectQueryBuilder<ObjectLiteral>,
    state?: PaymentAllocationState,
  ) {
    if (state === PaymentAllocationState.UNALLOCATED)
      qb.andWhere('COALESCE(allocation_total.allocated, 0) = 0');
    if (state === PaymentAllocationState.PARTIAL)
      qb.andWhere(
        'COALESCE(allocation_total.allocated, 0) > 0 AND COALESCE(allocation_total.allocated, 0) < payment.amountMinor',
      );
    if (state === PaymentAllocationState.ALLOCATED)
      qb.andWhere(
        'COALESCE(allocation_total.allocated, 0) >= payment.amountMinor',
      );
  }

  private accrualListView(row: Record<string, unknown>) {
    const amountMinor = this.number(row.amount);
    const allocatedMinor = this.number(row.allocated);
    const status = String(row.status);
    const state =
      status === 'cancelled'
        ? AccrualPaymentState.CANCELLED
        : allocatedMinor === 0
          ? AccrualPaymentState.UNPAID
          : allocatedMinor < amountMinor
            ? AccrualPaymentState.PARTIALLY_PAID
            : AccrualPaymentState.PAID;
    return {
      id: String(row.id),
      customerId: String(row.customerId),
      customerName: String(row.customerName),
      sourceType: String(row.sourceType),
      orderGroupId: row.orderGroupId == null ? null : Number(row.orderGroupId),
      orderNumber: this.nullableString(row.orderNumber),
      title: String(row.title),
      status,
      version: Number(row.version),
      businessDate: String(row.businessDate),
      ...this.moneyFields('amount', amountMinor),
      ...this.moneyFields('allocated', allocatedMinor),
      ...this.moneyFields(
        'remaining',
        Math.max(amountMinor - allocatedMinor, 0),
      ),
      state,
    };
  }

  private paymentListView(row: Record<string, unknown>) {
    const amountMinor = this.number(row.amount);
    const allocatedMinor = this.number(row.allocated);
    const allocationState =
      allocatedMinor === 0
        ? PaymentAllocationState.UNALLOCATED
        : allocatedMinor < amountMinor
          ? PaymentAllocationState.PARTIAL
          : PaymentAllocationState.ALLOCATED;
    return {
      id: String(row.id),
      customerId: String(row.customerId),
      customerName: String(row.customerName),
      businessDate: String(row.businessDate),
      method: String(row.method),
      externalReference: this.nullableString(row.externalReference),
      comment: this.nullableString(row.comment),
      status: String(row.status),
      version: Number(row.version),
      ...this.moneyFields('amount', amountMinor),
      ...this.moneyFields('allocated', allocatedMinor),
      ...this.moneyFields(
        'unallocated',
        Math.max(amountMinor - allocatedMinor, 0),
      ),
      allocationState,
    };
  }

  private page<T>(
    rows: Record<string, unknown>[],
    limit: number,
    map: (row: Record<string, unknown>) => T,
  ) {
    const hasMore = rows.length > limit;
    const visible = rows.slice(0, limit);
    const last = visible.at(-1);
    return {
      items: visible.map(map),
      meta: {
        limit,
        nextCursor:
          hasMore && last
            ? this.encodeCursor({
                businessDate: String(last.businessDate),
                id: String(last.id),
              })
            : null,
      },
    };
  }

  private aggregateBalances(
    rows: Array<{ accrued: string | number; paid: string | number }>,
    allocatedRow: { amount: string | number },
  ): MoneyTotals {
    let accruedMinor = 0;
    let paidMinor = 0;
    let debtMinor = 0;
    let advanceMinor = 0;
    for (const row of rows) {
      const accrued = this.number(row.accrued);
      const paid = this.number(row.paid);
      accruedMinor += accrued;
      paidMinor += paid;
      debtMinor += Math.max(accrued - paid, 0);
      advanceMinor += Math.max(paid - accrued, 0);
    }
    const allocatedMinor = this.number(allocatedRow.amount);
    return {
      accruedMinor,
      paidMinor,
      balanceMinor: accruedMinor - paidMinor,
      debtMinor,
      advanceMinor,
      allocatedMinor,
      unallocatedMinor: Math.max(paidMinor - allocatedMinor, 0),
    };
  }

  private moneyView(totals: MoneyTotals) {
    return {
      ...totals,
      accrued: formatMinorToRubles(totals.accruedMinor),
      paid: formatMinorToRubles(totals.paidMinor),
      balance: formatMinorToRubles(totals.balanceMinor),
      debt: formatMinorToRubles(totals.debtMinor),
      advance: formatMinorToRubles(totals.advanceMinor),
      allocated: formatMinorToRubles(totals.allocatedMinor),
      unallocated: formatMinorToRubles(totals.unallocatedMinor),
    };
  }
  private moneyFields<Name extends string>(
    name: Name,
    amountMinor: number,
  ): Record<`${Name}Minor`, number> & Record<Name, string> {
    assertSafeMinorAmount(amountMinor);
    return {
      [`${name}Minor`]: amountMinor,
      [name]: formatMinorToRubles(amountMinor),
    } as Record<`${Name}Minor`, number> & Record<Name, string>;
  }
  private number(value: unknown) {
    const result = Number(value ?? 0);
    assertSafeMinorAmount(result);
    return result;
  }

  private nullableString(value: unknown) {
    return typeof value === 'string' ? value : null;
  }
  private encodeCursor(cursor: Cursor) {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
  }
  private decodeCursor(value: string): Cursor {
    try {
      const parsed = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      ) as Partial<Cursor>;
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(parsed.businessDate ?? '') ||
        typeof parsed.id !== 'string' ||
        !parsed.id
      )
        throw new Error();
      return parsed as Cursor;
    } catch {
      throw new BadRequestException('Invalid finance list cursor');
    }
  }
}
