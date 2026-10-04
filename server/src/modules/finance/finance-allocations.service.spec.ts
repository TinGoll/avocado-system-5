/* eslint-disable @typescript-eslint/no-require-imports */
import { randomUUID } from 'crypto';
import { BadRequestException, ConflictException } from '@nestjs/common';
import type { DataSource as DataSourceType } from 'typeorm';
import type { Customer as CustomerType } from '../customers/entities/customer.entity';
import type { FinanceAllocationsService as AllocationsType } from './finance-allocations.service';
import type { FinancePaymentsService as PaymentsType } from './finance-payments.service';
import type { FinanceAccrualsService as AccrualsType } from './finance-accruals.service';

jest.setTimeout(30_000);

describe('FinanceAllocationsService (SQLite)', () => {
  let source: DataSourceType;
  let allocations: AllocationsType;
  let payments: PaymentsType;
  let accruals: AccrualsType;
  let customer: CustomerType;
  let otherCustomer: CustomerType;
  let Customer: typeof import('../customers/entities/customer.entity').Customer;
  let CustomerLevel: typeof import('../customers/entities/customer.entity').CustomerLevel;
  let FinancialAccrual: typeof import('./entities/financial-accrual.entity').FinancialAccrual;
  let FinancialAccrualEntry: typeof import('./entities/financial-accrual-entry.entity').FinancialAccrualEntry;
  let FinancialAccrualSourceType: typeof import('./entities/financial-accrual.entity').FinancialAccrualSourceType;
  let FinancialAccrualStatus: typeof import('./entities/financial-accrual.entity').FinancialAccrualStatus;
  let FinancialAccrualEntryKind: typeof import('./entities/financial-accrual-entry.entity').FinancialAccrualEntryKind;
  let FinancialPayment: typeof import('./entities/financial-payment.entity').FinancialPayment;
  let FinancialPaymentMethod: typeof import('./entities/financial-payment.entity').FinancialPaymentMethod;
  let FinancialPaymentAllocationStatus: typeof import('./entities/financial-payment-allocation.entity').FinancialPaymentAllocationStatus;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    const typeorm = require('typeorm') as typeof import('typeorm');
    ({ Customer, CustomerLevel } =
      require('../customers/entities/customer.entity') as typeof import('../customers/entities/customer.entity'));
    ({ FinancialAccrual, FinancialAccrualSourceType, FinancialAccrualStatus } =
      require('./entities/financial-accrual.entity') as typeof import('./entities/financial-accrual.entity'));
    ({ FinancialAccrualEntry, FinancialAccrualEntryKind } =
      require('./entities/financial-accrual-entry.entity') as typeof import('./entities/financial-accrual-entry.entity'));
    ({ FinancialPayment, FinancialPaymentMethod } =
      require('./entities/financial-payment.entity') as typeof import('./entities/financial-payment.entity'));
    ({ FinancialPaymentAllocationStatus } =
      require('./entities/financial-payment-allocation.entity') as typeof import('./entities/financial-payment-allocation.entity'));
    const { FinanceAllocationsService } =
      require('./finance-allocations.service') as typeof import('./finance-allocations.service');
    const { FinancePaymentsService } =
      require('./finance-payments.service') as typeof import('./finance-payments.service');
    const { FinanceAccrualsService } =
      require('./finance-accruals.service') as typeof import('./finance-accruals.service');
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
    [customer, otherCustomer] = await source.getRepository(Customer).save([
      {
        name: 'Allocation customer',
        level: CustomerLevel.BRONZE,
        attributes: {},
      },
      { name: 'Other customer', level: CustomerLevel.BRONZE, attributes: {} },
    ]);
    allocations = new FinanceAllocationsService(source);
    payments = new FinancePaymentsService(
      source,
      source.getRepository(FinancialPayment),
      allocations,
    );
    accruals = new FinanceAccrualsService(
      source,
      source.getRepository(FinancialAccrual),
    );
  });

  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
    delete process.env.DB_TYPE;
  });

  const createAccrual = async (
    amountMinor: number,
    customerId = customer.id,
    status = FinancialAccrualStatus.ACTIVE,
  ) => {
    const accrual = await source.getRepository(FinancialAccrual).save({
      customerId,
      sourceType: FinancialAccrualSourceType.MANUAL,
      orderGroupId: null,
      title: 'Service',
      status,
      version: 0,
    });
    await source.getRepository(FinancialAccrualEntry).save({
      accrualId: accrual.id,
      kind: FinancialAccrualEntryKind.INITIAL,
      amountMinor,
      effectiveDate: '2026-09-23',
      reason: null,
      reversesEntryId: null,
      requestId: randomUUID(),
    });
    return accrual;
  };

  const createPayment = (
    amount = '100.00',
    initial: Array<{ accrualId: string; amount: string }> = [],
  ) =>
    payments.create({
      customerId: customer.id,
      amount,
      paymentDate: '2026-09-23',
      method: FinancialPaymentMethod.BANK_TRANSFER,
      requestId: randomUUID(),
      allocations: initial,
    });

  it('creates one payment for multiple accruals atomically and reports totals', async () => {
    const first = await createAccrual(6000);
    const second = await createAccrual(5000);
    const payment = await createPayment('100.00', [
      { accrualId: first.id, amount: '40.00' },
      { accrualId: second.id, amount: '30.00' },
    ]);
    expect(payment).toMatchObject({
      allocatedMinor: 7000,
      allocated: '70.00',
      unallocatedMinor: 3000,
      unallocated: '30.00',
    });
    expect(
      payment.allocations.filter(
        (row) => row.status === FinancialPaymentAllocationStatus.ACTIVE,
      ),
    ).toHaveLength(2);

    const before = await source.getRepository(FinancialPayment).count();
    await expect(
      createPayment('100.00', [
        { accrualId: first.id, amount: '10.00' },
        { accrualId: randomUUID(), amount: '10.00' },
      ]),
    ).rejects.toThrow();
    expect(await source.getRepository(FinancialPayment).count()).toBe(before);
  });

  it('replays initial allocations without duplicating them', async () => {
    const accrual = await createAccrual(10000);
    const command = {
      customerId: customer.id,
      amount: '100.00',
      paymentDate: '2026-09-23',
      method: FinancialPaymentMethod.CARD,
      requestId: randomUUID(),
      allocations: [{ accrualId: accrual.id, amount: '25.00' }],
    };
    const created = await payments.create(command);
    expect(await payments.create(command)).toEqual(created);
    expect(
      created.allocations.filter(
        (row) => row.status === FinancialPaymentAllocationStatus.ACTIVE,
      ),
    ).toHaveLength(1);
    await expect(
      payments.create({
        ...command,
        allocations: [{ accrualId: accrual.id, amount: '26.00' }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('supports multiple payments for one accrual and enforces both limits', async () => {
    const accrual = await createAccrual(10000);
    await createPayment('80.00', [{ accrualId: accrual.id, amount: '60.00' }]);
    await expect(
      createPayment('50.00', [{ accrualId: accrual.id, amount: '40.00' }]),
    ).resolves.toMatchObject({ allocatedMinor: 4000 });
    await expect(
      createPayment('10.00', [{ accrualId: accrual.id, amount: '11.00' }]),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      createPayment('20.00', [{ accrualId: accrual.id, amount: '1.00' }]),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('replaces, partially releases, and clears a full map with history', async () => {
    const first = await createAccrual(10000);
    const second = await createAccrual(10000);
    const payment = await createPayment('100.00', [
      { accrualId: first.id, amount: '40.00' },
      { accrualId: second.id, amount: '30.00' },
    ]);
    await expect(
      allocations.replace(payment.id, {
        allocations: [{ accrualId: first.id, amount: '20.00' }],
        expectedVersion: 0,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await allocations.replace(payment.id, {
      allocations: [{ accrualId: first.id, amount: '20.00' }],
      expectedVersion: 0,
      reason: 'Partial refund',
    });
    let detail = await payments.findOne(payment.id);
    expect(detail).toMatchObject({
      version: 1,
      allocatedMinor: 2000,
      unallocatedMinor: 8000,
    });
    expect(
      detail.allocations.filter(
        (row) => row.status === FinancialPaymentAllocationStatus.RELEASED,
      ),
    ).toHaveLength(2);
    await allocations.replace(payment.id, {
      allocations: [],
      expectedVersion: 1,
      reason: 'Clear map',
    });
    detail = await payments.findOne(payment.id);
    expect(detail).toMatchObject({
      version: 2,
      allocatedMinor: 0,
      unallocatedMinor: 10000,
    });
    expect(
      detail.allocations.filter(
        (row) => row.status === FinancialPaymentAllocationStatus.RELEASED,
      ),
    ).toHaveLength(3);
  });

  it('rolls a replacement back when one target is invalid', async () => {
    const accrual = await createAccrual(10000);
    const payment = await createPayment('100.00', [
      { accrualId: accrual.id, amount: '20.00' },
    ]);
    await expect(
      allocations.replace(payment.id, {
        allocations: [
          { accrualId: accrual.id, amount: '10.00' },
          { accrualId: randomUUID(), amount: '10.00' },
        ],
        expectedVersion: 0,
        reason: 'Must rollback',
      }),
    ).rejects.toThrow();
    expect(await payments.findOne(payment.id)).toMatchObject({
      version: 0,
      allocatedMinor: 2000,
      allocations: [
        expect.objectContaining({ status: 'active', amountMinor: 2000 }),
      ],
    });
  });

  it('rejects invalid targets, duplicate IDs, and cancelled state', async () => {
    const own = await createAccrual(10000);
    const foreign = await createAccrual(10000, otherCustomer.id);
    const cancelled = await createAccrual(
      10000,
      customer.id,
      FinancialAccrualStatus.CANCELLED,
    );
    const payment = await createPayment();
    await expect(
      allocations.replace(payment.id, {
        allocations: [
          { accrualId: own.id, amount: '1.00' },
          { accrualId: own.id, amount: '2.00' },
        ],
        expectedVersion: 0,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    for (const accrualId of [foreign.id, cancelled.id]) {
      await expect(
        allocations.replace(payment.id, {
          allocations: [{ accrualId, amount: '1.00' }],
          expectedVersion: 0,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    }
    await payments.cancel(payment.id, {
      cancellationDate: '2026-09-24',
      reason: 'Cancelled',
      expectedVersion: 0,
      requestId: randomUUID(),
    });
    await expect(
      allocations.replace(payment.id, {
        allocations: [{ accrualId: own.id, amount: '1.00' }],
        expectedVersion: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows only one concurrent request with the same version', async () => {
    const accrual = await createAccrual(10000);
    const payment = await createPayment();
    const command = {
      allocations: [{ accrualId: accrual.id, amount: '10.00' }],
      expectedVersion: 0,
    };
    const results = await Promise.allSettled([
      allocations.replace(payment.id, command),
      allocations.replace(payment.id, command),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(1);
  });

  it('keeps the accrual invariant during a concurrent decrease', async () => {
    const accrual = await createAccrual(10000);
    const payment = await createPayment();
    await Promise.allSettled([
      allocations.replace(payment.id, {
        allocations: [{ accrualId: accrual.id, amount: '80.00' }],
        expectedVersion: 0,
      }),
      accruals.adjust(accrual.id, {
        amount: '-50.00',
        reason: 'Decrease',
        effectiveDate: '2026-09-24',
        expectedVersion: 0,
        requestId: randomUUID(),
      }),
    ]);
    const detail = await payments.findOne(payment.id);
    const entries = await source.getRepository(FinancialAccrualEntry).findBy({
      accrualId: accrual.id,
    });
    const accrualTotal = entries.reduce(
      (sum, entry) => sum + entry.amountMinor,
      0,
    );
    expect(detail.allocatedMinor).toBeLessThanOrEqual(accrualTotal);
  });
});
