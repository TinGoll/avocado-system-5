/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { randomUUID } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import type { DataSource as DataSourceType } from 'typeorm';
import type { Customer as CustomerType } from '../customers/entities/customer.entity';
import type { FinanceReportsService as ReportsType } from './finance-reports.service';

jest.setTimeout(30_000);

describe('FinanceReportsService (SQLite)', () => {
  let source: DataSourceType;
  let reports: ReportsType;
  let firstCustomer: CustomerType;
  let secondCustomer: CustomerType;
  let Customer: typeof import('../customers/entities/customer.entity').Customer;
  let CustomerLevel: typeof import('../customers/entities/customer.entity').CustomerLevel;
  let FinancialAccrual: typeof import('./entities/financial-accrual.entity').FinancialAccrual;
  let FinancialAccrualEntry: typeof import('./entities/financial-accrual-entry.entity').FinancialAccrualEntry;
  let FinancialPayment: typeof import('./entities/financial-payment.entity').FinancialPayment;
  let FinancialPaymentAllocation: typeof import('./entities/financial-payment-allocation.entity').FinancialPaymentAllocation;
  let OrderGroup: typeof import('../order-groups/entities/order-group.entity').OrderGroup;
  let Order: typeof import('../orders/entities/order.entity').Order;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    const typeorm = require('typeorm') as typeof import('typeorm');
    ({ Customer, CustomerLevel } =
      require('../customers/entities/customer.entity') as typeof import('../customers/entities/customer.entity'));
    ({ FinancialAccrual } =
      require('./entities/financial-accrual.entity') as typeof import('./entities/financial-accrual.entity'));
    ({ FinancialAccrualEntry } =
      require('./entities/financial-accrual-entry.entity') as typeof import('./entities/financial-accrual-entry.entity'));
    ({ FinancialPayment } =
      require('./entities/financial-payment.entity') as typeof import('./entities/financial-payment.entity'));
    ({ FinancialPaymentAllocation } =
      require('./entities/financial-payment-allocation.entity') as typeof import('./entities/financial-payment-allocation.entity'));
    ({ OrderGroup } =
      require('../order-groups/entities/order-group.entity') as typeof import('../order-groups/entities/order-group.entity'));
    ({ Order } =
      require('../orders/entities/order.entity') as typeof import('../orders/entities/order.entity'));
    const { FinanceReportsService } =
      require('./finance-reports.service') as typeof import('./finance-reports.service');
    source = new typeorm.DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      synchronize: false,
      entities: [__dirname + '/../**/*.entity.ts'],
      migrations: [__dirname + '/../database/migrations/sqlite/*.ts'],
      migrationsTransactionMode: 'each',
    });
    await source.initialize();
    await source.runMigrations();
    const connection = (
      source.driver as unknown as {
        databaseConnection: {
          function(name: string, callback: (value: string) => string): void;
        };
      }
    ).databaseConnection;
    connection.function('unicode_lower', (value) =>
      String(value).toLocaleLowerCase('ru-RU'),
    );
    [firstCustomer, secondCustomer] = await source
      .getRepository(Customer)
      .save([
        {
          name: 'Альфа Принт',
          level: CustomerLevel.BRONZE,
          attributes: {},
        },
        {
          name: 'Beta',
          level: CustomerLevel.BRONZE,
          attributes: {},
        },
      ]);
    reports = new FinanceReportsService(source);
  });

  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
    delete process.env.DB_TYPE;
  });

  beforeEach(async () => {
    await source.getRepository(FinancialPaymentAllocation).clear();
    await source.getRepository(FinancialAccrualEntry).clear();
    await source.getRepository(FinancialPayment).clear();
    await source.getRepository(FinancialAccrual).clear();
  });

  const createAccrual = async (
    customerId: string,
    amountMinor: number,
    title: string,
  ) => {
    const accrual = await source.getRepository(FinancialAccrual).save({
      customerId,
      sourceType: 'manual',
      orderGroupId: null,
      title,
      status: 'active',
      version: 0,
    });
    await source.getRepository(FinancialAccrualEntry).save({
      accrualId: accrual.id,
      kind: 'initial',
      amountMinor,
      effectiveDate: '2026-09-23',
      reason: null,
      reversesEntryId: null,
      requestId: randomUUID(),
    });
    return accrual;
  };

  const createPayment = async (
    customerId: string,
    amountMinor: number,
    status: 'posted' | 'cancelled' = 'posted',
  ) =>
    source.getRepository(FinancialPayment).save({
      customerId,
      amountMinor,
      paymentDate: '2026-09-23',
      method: 'bank_transfer',
      externalReference: 'Счёт 42',
      comment: null,
      status,
      version: 0,
      requestId: randomUUID(),
      cancellationRequestId: null,
      cancelledAt: null,
      cancellationDate: null,
      cancellationReason: null,
    });

  it('returns zero totals for an empty finance domain', async () => {
    await expect(reports.getSummary()).resolves.toMatchObject({
      accruedMinor: 0,
      paidMinor: 0,
      balanceMinor: 0,
      debtMinor: 0,
      advanceMinor: 0,
      allocatedMinor: 0,
      unallocatedMinor: 0,
    });
  });

  it('calculates debt and advance per customer without subtracting allocations twice', async () => {
    const accrual = await createAccrual(firstCustomer.id, 10_000, 'Печать');
    const payment = await createPayment(firstCustomer.id, 7_000);
    await source.getRepository(FinancialPaymentAllocation).save({
      paymentId: payment.id,
      accrualId: accrual.id,
      amountMinor: 6_000,
      status: 'active',
      releasedAt: null,
      releaseReason: null,
    });
    await source.getRepository(FinancialPaymentAllocation).save({
      paymentId: payment.id,
      accrualId: accrual.id,
      amountMinor: 500,
      status: 'released',
      releasedAt: new Date(),
      releaseReason: 'Changed',
    });
    await createAccrual(secondCustomer.id, 2_000, 'Доставка');
    await createPayment(secondCustomer.id, 5_000);
    await createPayment(firstCustomer.id, 99_000, 'cancelled');

    await expect(reports.getSummary()).resolves.toMatchObject({
      accruedMinor: 12_000,
      paidMinor: 12_000,
      balanceMinor: 0,
      debtMinor: 3_000,
      advanceMinor: 3_000,
      allocatedMinor: 6_000,
      unallocatedMinor: 6_000,
    });
    await expect(reports.listCustomers('альфа')).resolves.toMatchObject({
      items: [
        {
          id: firstCustomer.id,
          debtMinor: 3_000,
          advanceMinor: 0,
          unallocatedMinor: 1_000,
        },
      ],
      meta: { count: 1 },
    });
  });

  it('searches with normalized parameters and paginates equal dates without duplicates', async () => {
    await createAccrual(firstCustomer.id, 1_000, 'Баннер');
    await createAccrual(firstCustomer.id, 2_000, 'Визитки');
    await createAccrual(firstCustomer.id, 3_000, 'Листовки');

    const search = await reports.listAccruals({
      search: 'АЛЬФА',
      limit: 10,
    });
    expect(search.items).toHaveLength(3);

    const firstPage = await reports.listAccruals({ limit: 2 });
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.meta.nextCursor).not.toBeNull();
    const secondPage = await reports.listAccruals({
      limit: 2,
      cursor: firstPage.meta.nextCursor!,
    });
    expect(secondPage.items).toHaveLength(1);
    expect(
      new Set([...firstPage.items, ...secondPage.items].map((item) => item.id))
        .size,
    ).toBe(3);
    await expect(
      reports.listAccruals({ limit: 2, cursor: 'broken' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns server-computed accrual and payment states', async () => {
    const accrual = await createAccrual(firstCustomer.id, 10_000, 'Монтаж');
    const payment = await createPayment(firstCustomer.id, 10_000);
    await source.getRepository(FinancialPaymentAllocation).save({
      paymentId: payment.id,
      accrualId: accrual.id,
      amountMinor: 4_000,
      status: 'active',
      releasedAt: null,
      releaseReason: null,
    });

    await expect(reports.listAccruals({ limit: 10 })).resolves.toMatchObject({
      items: [{ state: 'partially_paid', remainingMinor: 6_000 }],
      meta: { nextCursor: null },
    });
    await expect(reports.listPayments({ limit: 10 })).resolves.toMatchObject({
      items: [{ allocationState: 'partial', unallocatedMinor: 6_000 }],
      meta: { nextCursor: null },
    });
  });

  it('returns order totals, sync difference, and customer advance separately', async () => {
    const group = await source.getRepository(OrderGroup).save({
      orderNumber: `FA-06-${randomUUID()}`,
      customer: { id: firstCustomer.id, name: firstCustomer.name },
      customerId: firstCustomer.id,
      status: 'draft',
      managementVersion: 0,
      dueDate: null,
      customStatusId: null,
    });
    await source.getRepository(Order).save({
      name: 'Document',
      documentNumber: 1,
      characteristics: {},
      totalPrice: 120,
      orderGroup: group,
      dueDate: null,
      customStatusId: null,
      managementVersion: 0,
    });
    const accrual = await source.getRepository(FinancialAccrual).save({
      customerId: firstCustomer.id,
      sourceType: 'order',
      orderGroupId: group.id,
      title: group.orderNumber,
      status: 'active',
      version: 0,
    });
    await source.getRepository(FinancialAccrualEntry).save({
      accrualId: accrual.id,
      kind: 'initial',
      amountMinor: 10_000,
      effectiveDate: '2026-09-23',
      reason: null,
      reversesEntryId: null,
      requestId: randomUUID(),
    });
    await createPayment(firstCustomer.id, 15_000);

    await expect(reports.getOrderGroup(group.id)).resolves.toMatchObject({
      orderTotalMinor: 12_000,
      accruedMinor: 10_000,
      allocatedMinor: 0,
      remainingMinor: 10_000,
      syncDifferenceMinor: 2_000,
      customerUnallocatedAdvanceMinor: 15_000,
      accrualId: accrual.id,
    });
  });
});
