/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */
import { randomUUID } from 'node:crypto';
import type { DataSource as DataSourceType } from 'typeorm';
import type { Customer as CustomerType } from '../customers/entities/customer.entity';
import type { CustomerFinanceHistoryService as ServiceType } from './customer-finance-history.service';

jest.setTimeout(30_000);

describe('CustomerFinanceHistoryService (SQLite)', () => {
  let source: DataSourceType;
  let service: ServiceType;
  let customer: CustomerType;
  let Customer: typeof import('../customers/entities/customer.entity').Customer;
  let CustomerLevel: typeof import('../customers/entities/customer.entity').CustomerLevel;
  let FinancialAccrual: typeof import('./entities/financial-accrual.entity').FinancialAccrual;
  let FinancialAccrualEntry: typeof import('./entities/financial-accrual-entry.entity').FinancialAccrualEntry;
  let FinancialPayment: typeof import('./entities/financial-payment.entity').FinancialPayment;
  let FinancialPaymentAllocation: typeof import('./entities/financial-payment-allocation.entity').FinancialPaymentAllocation;
  let FinancialAllocationBatch: typeof import('./entities/financial-allocation-batch.entity').FinancialAllocationBatch;

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
    ({ FinancialAllocationBatch } =
      require('./entities/financial-allocation-batch.entity') as typeof import('./entities/financial-allocation-batch.entity'));
    const { CustomerFinanceHistoryService } =
      require('./customer-finance-history.service') as typeof import('./customer-finance-history.service');
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
    customer = await source.getRepository(Customer).save({
      name: 'Заказчик',
      companyName: 'Компания',
      level: CustomerLevel.BRONZE,
      attributes: {},
    });
    service = new CustomerFinanceHistoryService(source);
  });

  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
    delete process.env.DB_TYPE;
  });

  beforeEach(async () => {
    await source.getRepository(FinancialPaymentAllocation).clear();
    await source.getRepository(FinancialAllocationBatch).clear();
    await source.getRepository(FinancialAccrualEntry).clear();
    await source.getRepository(FinancialPayment).clear();
    await source.getRepository(FinancialAccrual).clear();
  });

  const createPayment = (overrides: Record<string, unknown> = {}) =>
    source.getRepository(FinancialPayment).save({
      customerId: customer.id,
      amountMinor: 1_000,
      paymentDate: '2026-10-03',
      method: 'cash',
      externalReference: null,
      comment: null,
      status: 'posted',
      version: 0,
      requestId: randomUUID(),
      cancellationRequestId: null,
      cancelledAt: null,
      cancellationDate: null,
      cancellationReason: null,
      ...overrides,
    });

  const createAccrual = async () => {
    const accrual = await source.getRepository(FinancialAccrual).save({
      customerId: customer.id,
      sourceType: 'manual',
      orderGroupId: null,
      title: 'Корректировка',
      status: 'active',
      version: 0,
    });
    return accrual;
  };

  it('paginates stable across identical timestamps without duplicates', async () => {
    const createdAt = new Date('2026-10-03T10:00:00.000Z');
    await Promise.all([
      createPayment({ createdAt, externalReference: 'A' }),
      createPayment({ createdAt, externalReference: 'B' }),
      createPayment({ createdAt, externalReference: 'C' }),
    ]);

    const seen = new Set<string>();
    let cursor: string | undefined;
    const pageSizes: number[] = [];
    do {
      const page = await service.getHistory(customer.id, {
        limit: 2,
        cursor,
      });
      pageSizes.push(page.items.length);
      page.items.forEach((item) => seen.add(`${item.type}:${item.id}`));
      cursor = page.meta.nextCursor ?? undefined;
    } while (cursor);

    expect(pageSizes).toEqual([2, 1]);
    expect(seen.size).toBe(3);
  });

  it('filters one or several operation types', async () => {
    await createPayment();
    const accrual = await createAccrual();
    await source.getRepository(FinancialAccrualEntry).save([
      {
        accrualId: accrual.id,
        kind: 'initial',
        amountMinor: 200,
        effectiveDate: '2026-10-03',
        reason: 'Ручная операция',
        reversesEntryId: null,
        requestId: randomUUID(),
      },
      {
        accrualId: accrual.id,
        kind: 'reversal',
        amountMinor: -200,
        effectiveDate: '2026-10-03',
        reason: 'Аннулировано',
        reversesEntryId: null,
        requestId: randomUUID(),
      },
    ]);

    const page = await service.getHistory(customer.id, {
      limit: 10,
      types: ['payment', 'reversal'] as never,
    });

    expect(new Set(page.items.map((item) => item.type))).toEqual(
      new Set(['payment', 'reversal']),
    );
    expect(page.items).toHaveLength(2);
  });

  it('returns cancelled operations as separate history events', async () => {
    await createPayment({
      status: 'cancelled',
      cancellationRequestId: randomUUID(),
      cancelledAt: new Date('2026-10-03T11:00:00.000Z'),
      cancellationDate: '2026-10-03',
      cancellationReason: 'Возврат клиенту',
    });

    const page = await service.getHistory(customer.id, {
      limit: 10,
      types: ['payment_cancellation'] as never,
    });

    expect(page.items).toEqual([
      expect.objectContaining({
        type: 'payment_cancellation',
        amount: '-10.00',
        comment: 'Возврат клиенту',
      }),
    ]);
  });

  it('links a batch event to its result and exposes order details', async () => {
    const batch = await source.getRepository(FinancialAllocationBatch).save({
      customerId: customer.id,
      requestId: randomUUID(),
      comment: 'По выбранным заказам',
      authorName: 'Менеджер',
      totalMinor: 1_500,
      balanceAfterMinor: 500,
      requestSnapshot: { comment: null, allocations: [] },
      resultSnapshot: [
        {
          accrualId: randomUUID(),
          orderGroupId: 42,
          orderNumber: 'З-42',
          allocatedMinor: 1_500,
          newDebtMinor: 500,
        },
      ],
    });

    const page = await service.getHistory(customer.id, {
      limit: 10,
      types: ['allocation'] as never,
    });

    expect(page.items).toEqual([
      expect.objectContaining({
        operationId: batch.id,
        amount: '15.00',
        employee: 'Менеджер',
        details: [{ orderGroupId: 42, orderNumber: 'З-42', amount: '15.00' }],
      }),
    ]);
  });
});
