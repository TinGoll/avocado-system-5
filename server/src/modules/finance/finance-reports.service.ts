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
  CustomerStatementQueryDto,
  FinanceListQueryDto,
  FinanceTurnoverReportType,
  PaymentAllocationState,
  PaymentListQueryDto,
  TurnoverReportQueryDto,
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
  FinancialPaymentMethod,
  FinancialPaymentStatus,
} from './entities/financial-payment.entity';
import {
  assertSafeMinorAmount,
  formatMinorToRubles,
  parseRublesToMinor,
} from './finance-money';

type Cursor = { businessDate: string; id: string };
type ReportCursor = {
  businessDate: string;
  createdAt: string;
  id: string;
  kind: string;
};
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
      accrualVersion:
        accrualRow?.version == null ? null : Number(accrualRow.version),
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

  async getTurnover(query: TurnoverReportQueryDto) {
    this.assertDateRange(query);
    if (query.reportType === FinanceTurnoverReportType.ACCRUALS)
      return this.getAccrualTurnover(query);
    return this.getPaymentTurnover(query);
  }

  async getCustomerStatement(
    customerId: string,
    query: CustomerStatementQueryDto,
  ) {
    this.assertDateRange(query);
    const customer = await this.source
      .getRepository(Customer)
      .findOneBy({ id: customerId });
    if (!customer) throw new NotFoundException('Customer not found');

    const [entryRows, paymentRows, allocationRows] = await Promise.all([
      this.source
        .getRepository(FinancialAccrualEntry)
        .createQueryBuilder('entry')
        .innerJoin(FinancialAccrual, 'accrual', 'accrual.id = entry.accrualId')
        .select('entry.id', 'id')
        .addSelect('entry.effectiveDate', 'businessDate')
        .addSelect('entry.createdAt', 'createdAt')
        .addSelect('entry.kind', 'entryKind')
        .addSelect('entry.amountMinor', 'amount')
        .addSelect('entry.reason', 'reason')
        .addSelect('accrual.title', 'title')
        .where('accrual.customerId = :customerId', { customerId })
        .getRawMany<Record<string, unknown>>(),
      this.source
        .getRepository(FinancialPayment)
        .createQueryBuilder('payment')
        .select('payment.id', 'id')
        .addSelect('payment.paymentDate', 'paymentDate')
        .addSelect('payment.createdAt', 'createdAt')
        .addSelect('payment.amountMinor', 'amount')
        .addSelect('payment.method', 'method')
        .addSelect('payment.externalReference', 'externalReference')
        .addSelect('payment.comment', 'comment')
        .addSelect('payment.cancellationDate', 'cancellationDate')
        .addSelect('payment.cancelledAt', 'cancelledAt')
        .addSelect('payment.cancellationReason', 'cancellationReason')
        .where('payment.customerId = :customerId', { customerId })
        .getRawMany<Record<string, unknown>>(),
      this.source
        .getRepository(FinancialPaymentAllocation)
        .createQueryBuilder('allocation')
        .innerJoin(
          FinancialPayment,
          'payment',
          'payment.id = allocation.paymentId',
        )
        .select('allocation.amountMinor', 'amount')
        .addSelect('allocation.createdAt', 'createdAt')
        .addSelect('allocation.releasedAt', 'releasedAt')
        .addSelect('payment.paymentDate', 'paymentDate')
        .addSelect('payment.cancellationDate', 'cancellationDate')
        .where('payment.customerId = :customerId', { customerId })
        .getRawMany<Record<string, unknown>>(),
    ]);

    const entries = [
      ...entryRows.map((row) =>
        this.statementEntry({
          id: String(row.id),
          kind: `accrual_${String(row.entryKind)}`,
          businessDate: String(row.businessDate),
          createdAt: this.iso(row.createdAt),
          title: String(row.title),
          details: this.nullableString(row.reason),
          accrualMinor: this.number(row.amount),
          paymentMinor: 0,
        }),
      ),
      ...paymentRows.flatMap((row) => {
        const amountMinor = this.number(row.amount);
        const title =
          this.nullableString(row.externalReference) ??
          this.nullableString(row.comment) ??
          'Оплата';
        const rows = [
          this.statementEntry({
            id: String(row.id),
            kind: 'payment',
            businessDate: String(row.paymentDate),
            createdAt: this.iso(row.createdAt),
            title,
            details: this.nullableString(row.method),
            accrualMinor: 0,
            paymentMinor: amountMinor,
          }),
        ];
        if (row.cancellationDate)
          rows.push(
            this.statementEntry({
              id: String(row.id),
              kind: 'payment_cancellation',
              businessDate: this.dateValue(row.cancellationDate),
              createdAt: this.iso(row.cancelledAt),
              title: `Сторно: ${title}`,
              details: this.nullableString(row.cancellationReason),
              accrualMinor: 0,
              paymentMinor: -amountMinor,
            }),
          );
        return rows;
      }),
    ].sort((a, b) => this.compareReportRows(a, b));

    const before = entries.filter(
      (entry) => query.dateFrom && entry.businessDate < query.dateFrom,
    );
    const period = entries.filter(
      (entry) =>
        (!query.dateFrom || entry.businessDate >= query.dateFrom) &&
        (!query.dateTo || entry.businessDate <= query.dateTo),
    );
    const openingBalanceMinor = before.reduce(
      (sum, entry) => sum + entry.balanceChangeMinor,
      0,
    );
    const accruedMinor = period.reduce(
      (sum, entry) => sum + entry.accrualMinor,
      0,
    );
    const paidMinor = period.reduce(
      (sum, entry) => sum + entry.paymentMinor,
      0,
    );
    const closingBalanceMinor = openingBalanceMinor + accruedMinor - paidMinor;
    const asOfDate = query.dateTo ?? '9999-12-31';
    const paymentAsOfMinor = paymentRows.reduce((sum, row) => {
      if (String(row.paymentDate) > asOfDate) return sum;
      const cancelled =
        row.cancellationDate &&
        this.dateValue(row.cancellationDate) <= asOfDate;
      return sum + (cancelled ? 0 : this.number(row.amount));
    }, 0);
    const allocatedAsOfMinor = allocationRows.reduce((sum, row) => {
      if (String(row.paymentDate) > asOfDate) return sum;
      if (
        row.cancellationDate &&
        this.dateValue(row.cancellationDate) <= asOfDate
      )
        return sum;
      const createdDate = this.iso(row.createdAt).slice(0, 10);
      const releasedDate = row.releasedAt
        ? this.iso(row.releasedAt).slice(0, 10)
        : null;
      return createdDate <= asOfDate &&
        (!releasedDate || releasedDate > asOfDate)
        ? sum + this.number(row.amount)
        : sum;
    }, 0);
    const totals = {
      ...this.moneyFields('openingBalance', openingBalanceMinor),
      ...this.moneyFields('accrued', accruedMinor),
      ...this.moneyFields('paid', paidMinor),
      ...this.moneyFields('closingBalance', closingBalanceMinor),
      ...this.moneyFields(
        'unallocatedAdvance',
        Math.max(paymentAsOfMinor - allocatedAsOfMinor, 0),
      ),
    };
    const page = this.reportPage(period, query.limit, query.cursor);
    return {
      customer: {
        id: customer.id,
        name: customer.name,
        companyName: customer.companyName ?? null,
      },
      items: page.items,
      totals,
      meta: page.meta,
    };
  }

  private async getAccrualTurnover(query: TurnoverReportQueryDto) {
    if (query.method || query.allocationState)
      throw new BadRequestException(
        'Payment filters are not valid for an accrual turnover report',
      );
    if (query.status === FinancialPaymentStatus.POSTED)
      throw new BadRequestException(
        'Payment status is not valid for an accrual turnover report',
      );
    const qb = this.source
      .getRepository(FinancialAccrualEntry)
      .createQueryBuilder('entry')
      .innerJoin(FinancialAccrual, 'accrual', 'accrual.id = entry.accrualId')
      .innerJoin(Customer, 'customer', 'customer.id = accrual.customerId')
      .leftJoin(
        OrderGroup,
        'order_group',
        'order_group.id = accrual.orderGroupId',
      )
      .select('entry.id', 'id')
      .addSelect('entry.effectiveDate', 'businessDate')
      .addSelect('entry.createdAt', 'createdAt')
      .addSelect('entry.kind', 'entryKind')
      .addSelect('entry.amountMinor', 'amount')
      .addSelect('entry.reason', 'reason')
      .addSelect('accrual.id', 'accrualId')
      .addSelect('accrual.customerId', 'customerId')
      .addSelect('customer.name', 'customerName')
      .addSelect('accrual.sourceType', 'sourceType')
      .addSelect('accrual.orderGroupId', 'orderGroupId')
      .addSelect('order_group.orderNumber', 'orderNumber')
      .addSelect('accrual.title', 'title')
      .addSelect('accrual.status', 'status');
    if (query.customerId)
      qb.andWhere('accrual.customerId = :customerId', {
        customerId: query.customerId,
      });
    if (query.sourceType)
      qb.andWhere('accrual.sourceType = :sourceType', {
        sourceType: query.sourceType,
      });
    if (query.status)
      qb.andWhere('accrual.status = :status', { status: query.status });
    const rows = await qb.getRawMany<Record<string, unknown>>();
    const term = query.search?.trim().toLocaleLowerCase('ru-RU');
    const items = rows
      .map((row) => {
        const amountMinor = this.number(row.amount);
        const entryKind = String(row.entryKind);
        return {
          id: String(row.id),
          kind: 'accrual' as const,
          businessDate: String(row.businessDate),
          createdAt: this.iso(row.createdAt),
          accrualId: String(row.accrualId),
          customerId: String(row.customerId),
          customerName: String(row.customerName),
          sourceType: String(row.sourceType),
          orderGroupId:
            row.orderGroupId == null ? null : Number(row.orderGroupId),
          orderNumber: this.nullableString(row.orderNumber),
          title: String(row.title),
          status: String(row.status),
          entryKind,
          reason: this.nullableString(row.reason),
          ...this.moneyFields(
            'initial',
            entryKind === 'initial' ? amountMinor : 0,
          ),
          ...this.moneyFields(
            'adjustments',
            entryKind === 'initial' ? 0 : amountMinor,
          ),
          ...this.moneyFields('amount', amountMinor),
        };
      })
      .filter(
        (item) =>
          (!query.dateFrom || item.businessDate >= query.dateFrom) &&
          (!query.dateTo || item.businessDate <= query.dateTo) &&
          (!term ||
            `${item.customerName} ${item.title} ${item.orderNumber ?? ''} ${item.reason ?? ''}`
              .toLocaleLowerCase('ru-RU')
              .includes(term)),
      )
      .sort((a, b) => this.compareReportRows(a, b));
    const totalMinor = items.reduce((sum, item) => sum + item.amountMinor, 0);
    const page = this.reportPage(items, query.limit, query.cursor);
    return {
      reportType: query.reportType,
      items: page.items,
      totals: {
        count: items.length,
        ...this.moneyFields(
          'initial',
          items.reduce((sum, item) => sum + item.initialMinor, 0),
        ),
        ...this.moneyFields(
          'adjustments',
          items.reduce((sum, item) => sum + item.adjustmentsMinor, 0),
        ),
        ...this.moneyFields('amount', totalMinor),
      },
      meta: page.meta,
    };
  }

  private async getPaymentTurnover(query: TurnoverReportQueryDto) {
    if (query.sourceType)
      throw new BadRequestException(
        'Accrual filters are not valid for a payment turnover report',
      );
    if (query.status === FinancialAccrualStatus.ACTIVE)
      throw new BadRequestException(
        'Accrual status is not valid for a payment turnover report',
      );
    const allocations = this.source
      .getRepository(FinancialPaymentAllocation)
      .createQueryBuilder('allocation')
      .select('allocation.paymentId', 'payment_id')
      .addSelect(
        `SUM(CASE WHEN allocation.status = 'active' THEN allocation.amountMinor ELSE 0 END)`,
        'allocated',
      )
      .groupBy('allocation.paymentId');
    const qb = this.source
      .getRepository(FinancialPayment)
      .createQueryBuilder('payment')
      .innerJoin(Customer, 'customer', 'customer.id = payment.customerId')
      .leftJoin(
        `(${allocations.getQuery()})`,
        'allocation_total',
        'allocation_total.payment_id = payment.id',
      )
      .select('payment.id', 'id')
      .addSelect('payment.customerId', 'customerId')
      .addSelect('customer.name', 'customerName')
      .addSelect('payment.amountMinor', 'amount')
      .addSelect('payment.paymentDate', 'paymentDate')
      .addSelect('payment.createdAt', 'createdAt')
      .addSelect('payment.method', 'method')
      .addSelect('payment.externalReference', 'externalReference')
      .addSelect('payment.comment', 'comment')
      .addSelect('payment.status', 'status')
      .addSelect('payment.cancellationDate', 'cancellationDate')
      .addSelect('payment.cancelledAt', 'cancelledAt')
      .addSelect('payment.cancellationReason', 'cancellationReason')
      .addSelect('COALESCE(allocation_total.allocated, 0)', 'allocated');
    if (query.customerId)
      qb.andWhere('payment.customerId = :customerId', {
        customerId: query.customerId,
      });
    if (query.method)
      qb.andWhere('payment.method = :method', { method: query.method });
    if (query.status)
      qb.andWhere('payment.status = :status', { status: query.status });
    const rows = await qb.getRawMany<Record<string, unknown>>();
    const term = query.search?.trim().toLocaleLowerCase('ru-RU');
    const items = rows
      .flatMap((row) => {
        const amountMinor = this.number(row.amount);
        const allocatedMinor = this.number(row.allocated);
        const base = {
          id: String(row.id),
          customerId: String(row.customerId),
          customerName: String(row.customerName),
          method: String(row.method),
          externalReference: this.nullableString(row.externalReference),
          comment: this.nullableString(row.comment),
          status: String(row.status),
        };
        const result = [
          {
            ...base,
            kind: 'payment',
            businessDate: String(row.paymentDate),
            createdAt: this.iso(row.createdAt),
            cancelled: false,
            ...this.moneyFields('amount', amountMinor),
            ...this.moneyFields('allocated', allocatedMinor),
            ...this.moneyFields(
              'unallocated',
              Math.max(amountMinor - allocatedMinor, 0),
            ),
          },
        ];
        if (row.cancellationDate)
          result.push({
            ...base,
            kind: 'payment_cancellation',
            businessDate: this.dateValue(row.cancellationDate),
            createdAt: this.iso(row.cancelledAt),
            cancelled: true,
            ...this.moneyFields('amount', -amountMinor),
            ...this.moneyFields('allocated', -allocatedMinor),
            ...this.moneyFields(
              'unallocated',
              -Math.max(amountMinor - allocatedMinor, 0),
            ),
          });
        return result;
      })
      .filter((item) => {
        const allocationState =
          Math.abs(item.allocatedMinor) === 0
            ? PaymentAllocationState.UNALLOCATED
            : Math.abs(item.allocatedMinor) < Math.abs(item.amountMinor)
              ? PaymentAllocationState.PARTIAL
              : PaymentAllocationState.ALLOCATED;
        return (
          (!query.dateFrom || item.businessDate >= query.dateFrom) &&
          (!query.dateTo || item.businessDate <= query.dateTo) &&
          (!query.allocationState ||
            allocationState === query.allocationState) &&
          (!term ||
            `${item.customerName} ${item.externalReference ?? ''} ${item.comment ?? ''}`
              .toLocaleLowerCase('ru-RU')
              .includes(term))
        );
      })
      .sort((a, b) => this.compareReportRows(a, b));
    const byMethod = Object.values(FinancialPaymentMethod).map((method) => {
      const amountMinor = items
        .filter((item) => item.method === String(method))
        .reduce((sum, item) => sum + item.amountMinor, 0);
      return { method, ...this.moneyFields('amount', amountMinor) };
    });
    const page = this.reportPage(items, query.limit, query.cursor);
    return {
      reportType: query.reportType,
      items: page.items,
      totals: {
        count: items.length,
        ...this.moneyFields(
          'amount',
          items.reduce((sum, item) => sum + item.amountMinor, 0),
        ),
        ...this.moneyFields(
          'allocated',
          items.reduce((sum, item) => sum + item.allocatedMinor, 0),
        ),
        ...this.moneyFields(
          'unallocated',
          items.reduce((sum, item) => sum + item.unallocatedMinor, 0),
        ),
        byMethod,
      },
      meta: page.meta,
    };
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
      .addSelect('accrual.version', 'version')
      .addSelect('COALESCE(SUM(entry.amountMinor), 0)', 'amount')
      .where('accrual.orderGroupId = :orderGroupId', { orderGroupId })
      .groupBy('accrual.id')
      .addGroupBy('accrual.status')
      .addGroupBy('accrual.version')
      .getRawOne<{
        id: string;
        status: string;
        version: number | string;
        amount: string | number;
      }>();
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

  private statementEntry(input: {
    id: string;
    kind: string;
    businessDate: string;
    createdAt: string;
    title: string;
    details: string | null;
    accrualMinor: number;
    paymentMinor: number;
  }) {
    return {
      ...input,
      ...this.moneyFields('accrual', input.accrualMinor),
      ...this.moneyFields('payment', input.paymentMinor),
      ...this.moneyFields(
        'balanceChange',
        input.accrualMinor - input.paymentMinor,
      ),
    };
  }

  private assertDateRange(query: FinanceListQueryDto) {
    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo)
      throw new BadRequestException('dateFrom must not be after dateTo');
  }

  private reportPage<
    T extends {
      businessDate: string;
      createdAt: string;
      id: string;
      kind: string;
    },
  >(items: T[], limit: number, cursorValue?: string) {
    const cursor = cursorValue ? this.decodeReportCursor(cursorValue) : null;
    const remaining = cursor
      ? items.filter((item) => this.compareReportRows(item, cursor) > 0)
      : items;
    const visible = remaining.slice(0, limit);
    const last = visible.at(-1);
    return {
      items: visible,
      meta: {
        limit,
        nextCursor:
          remaining.length > limit && last
            ? this.encodeReportCursor(last)
            : null,
      },
    };
  }

  private compareReportRows(left: ReportCursor, right: ReportCursor): number {
    return (
      left.businessDate.localeCompare(right.businessDate) ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id) ||
      left.kind.localeCompare(right.kind)
    );
  }

  private encodeReportCursor(cursor: ReportCursor) {
    return Buffer.from(
      JSON.stringify({
        businessDate: cursor.businessDate,
        createdAt: cursor.createdAt,
        id: cursor.id,
        kind: cursor.kind,
      }),
      'utf8',
    ).toString('base64url');
  }

  private decodeReportCursor(value: string): ReportCursor {
    try {
      const parsed = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      ) as Partial<ReportCursor>;
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(parsed.businessDate ?? '') ||
        typeof parsed.createdAt !== 'string' ||
        typeof parsed.id !== 'string' ||
        typeof parsed.kind !== 'string' ||
        !parsed.createdAt ||
        !parsed.id ||
        !parsed.kind
      )
        throw new Error();
      return parsed as ReportCursor;
    } catch {
      throw new BadRequestException('Invalid finance report cursor');
    }
  }

  private iso(value: unknown) {
    if (value instanceof Date) return value.toISOString();
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime()))
      throw new BadRequestException('Invalid finance operation timestamp');
    return parsed.toISOString();
  }

  private dateValue(value: unknown) {
    if (typeof value === 'string') return value.slice(0, 10);
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    throw new BadRequestException('Invalid finance business date');
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
