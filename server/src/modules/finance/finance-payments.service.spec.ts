/* eslint-disable @typescript-eslint/no-require-imports */
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { DataSource as DataSourceType } from 'typeorm';
import type { Customer as CustomerType } from '../customers/entities/customer.entity';
import type { FinancePaymentsService as ServiceType } from './finance-payments.service';

jest.setTimeout(30_000);

describe('FinancePaymentsService (SQLite)', () => {
  let source: DataSourceType;
  let service: ServiceType;
  let customer: CustomerType;
  let Customer: typeof import('../customers/entities/customer.entity').Customer;
  let CustomerLevel: typeof import('../customers/entities/customer.entity').CustomerLevel;
  let FinancialPayment: typeof import('./entities/financial-payment.entity').FinancialPayment;
  let FinancialPaymentMethod: typeof import('./entities/financial-payment.entity').FinancialPaymentMethod;
  let FinancialAccrual: typeof import('./entities/financial-accrual.entity').FinancialAccrual;
  let FinancialAccrualSourceType: typeof import('./entities/financial-accrual.entity').FinancialAccrualSourceType;
  let FinancialAccrualStatus: typeof import('./entities/financial-accrual.entity').FinancialAccrualStatus;
  let FinancialPaymentAllocation: typeof import('./entities/financial-payment-allocation.entity').FinancialPaymentAllocation;
  let FinancialPaymentAllocationStatus: typeof import('./entities/financial-payment-allocation.entity').FinancialPaymentAllocationStatus;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    const typeorm = require('typeorm') as typeof import('typeorm');
    ({ Customer, CustomerLevel } =
      require('../customers/entities/customer.entity') as typeof import('../customers/entities/customer.entity'));
    ({ FinancialPayment, FinancialPaymentMethod } =
      require('./entities/financial-payment.entity') as typeof import('./entities/financial-payment.entity'));
    ({ FinancialAccrual, FinancialAccrualSourceType, FinancialAccrualStatus } =
      require('./entities/financial-accrual.entity') as typeof import('./entities/financial-accrual.entity'));
    ({ FinancialPaymentAllocation, FinancialPaymentAllocationStatus } =
      require('./entities/financial-payment-allocation.entity') as typeof import('./entities/financial-payment-allocation.entity'));
    const { FinancePaymentsService } =
      require('./finance-payments.service') as typeof import('./finance-payments.service');
    const { FinanceAllocationsService } =
      require('./finance-allocations.service') as typeof import('./finance-allocations.service');
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
      name: 'Payment customer',
      level: CustomerLevel.BRONZE,
      attributes: {},
    });
    service = new FinancePaymentsService(
      source,
      source.getRepository(FinancialPayment),
      new FinanceAllocationsService(source),
    );
  });

  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
    delete process.env.DB_TYPE;
  });

  const dto = (requestId: string) => ({
    customerId: customer.id,
    amount: '125.50',
    paymentDate: '2026-09-22',
    method: FinancialPaymentMethod.CASH,
    externalReference: 'R-1',
    comment: 'Advance',
    requestId,
  });

  it('creates an advance and replays the same request', async () => {
    const command = dto('11111111-1111-4111-8111-111111111111');
    const created = await service.create(command);
    expect(await service.create(command)).toEqual(created);
    expect(await service.findOne(created.id)).toEqual(created);
    expect(created).toMatchObject({
      amountMinor: 12550,
      amount: '125.50',
      version: 0,
      reportOperations: [{ amountMinor: 12550, effectiveDate: '2026-09-22' }],
    });
    await expect(
      service.create({ ...command, amount: '1.00' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('accepts all payment methods and rejects an unknown customer', async () => {
    for (const [index, method] of Object.values(
      FinancialPaymentMethod,
    ).entries()) {
      await expect(
        service.create({
          ...dto(`22222222-2222-4222-8222-22222222222${index}`),
          method,
        }),
      ).resolves.toMatchObject({ method });
    }
    await expect(
      service.create({
        ...dto('33333333-3333-4333-8333-333333333333'),
        customerId: '99999999-9999-4999-8999-999999999999',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cancels idempotently and keeps both report dates', async () => {
    const payment = await service.create(
      dto('44444444-4444-4444-8444-444444444441'),
    );
    const command = {
      cancellationDate: '2026-09-23',
      reason: 'Wrong receipt',
      expectedVersion: 0,
      requestId: '44444444-4444-4444-8444-444444444442',
    };
    const cancelled = await service.cancel(payment.id, command);
    expect(await service.cancel(payment.id, command)).toEqual(cancelled);
    expect(cancelled).toMatchObject({
      status: 'cancelled',
      paymentDate: '2026-09-22',
      cancellationDate: '2026-09-23',
      version: 1,
      reportOperations: [
        { kind: 'payment', amountMinor: 12550, effectiveDate: '2026-09-22' },
        {
          kind: 'cancellation',
          amountMinor: -12550,
          effectiveDate: '2026-09-23',
        },
      ],
    });
    await expect(
      service.cancel(payment.id, {
        ...command,
        requestId: '44444444-4444-4444-8444-444444444443',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('releases active allocations when cancelling', async () => {
    const payment = await service.create(
      dto('77777777-7777-4777-8777-777777777771'),
    );
    const accrual = await source.getRepository(FinancialAccrual).save({
      customerId: customer.id,
      sourceType: FinancialAccrualSourceType.MANUAL,
      orderGroupId: null,
      title: 'Allocated service',
      status: FinancialAccrualStatus.ACTIVE,
      version: 0,
    });
    const allocation = await source
      .getRepository(FinancialPaymentAllocation)
      .save({
        paymentId: payment.id,
        accrualId: accrual.id,
        amountMinor: 100,
        status: FinancialPaymentAllocationStatus.ACTIVE,
        releasedAt: null,
        releaseReason: null,
      });

    await service.cancel(payment.id, {
      cancellationDate: '2026-09-24',
      reason: 'Payment cancelled',
      expectedVersion: 0,
      requestId: '77777777-7777-4777-8777-777777777772',
    });

    expect(
      await source.getRepository(FinancialPaymentAllocation).findOneByOrFail({
        id: allocation.id,
      }),
    ).toMatchObject({
      status: 'released',
      releaseReason: 'Payment cancelled',
    });
  });

  it('rejects a stale version without changing the payment', async () => {
    const payment = await service.create(
      dto('55555555-5555-4555-8555-555555555551'),
    );
    await expect(
      service.cancel(payment.id, {
        cancellationDate: '2026-09-23',
        reason: 'Stale',
        expectedVersion: 1,
        requestId: '55555555-5555-4555-8555-555555555552',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(await service.findOne(payment.id)).toMatchObject({
      status: 'posted',
      version: 0,
    });
  });

  it('rolls cancellation back when persistence fails', async () => {
    const payment = await service.create(
      dto('66666666-6666-4666-8666-666666666661'),
    );
    await source.query(`
      CREATE TRIGGER fail_payment_cancellation
      BEFORE UPDATE ON financial_payments
      WHEN NEW.cancellationReason = 'Force rollback'
      BEGIN
        SELECT RAISE(ABORT, 'forced failure');
      END
    `);
    await expect(
      service.cancel(payment.id, {
        cancellationDate: '2026-09-23',
        reason: 'Force rollback',
        expectedVersion: 0,
        requestId: '66666666-6666-4666-8666-666666666662',
      }),
    ).rejects.toThrow('forced failure');
    expect(await service.findOne(payment.id)).toMatchObject({
      status: 'posted',
      version: 0,
      cancellationDate: null,
    });
    await source.query('DROP TRIGGER fail_payment_cancellation');
  });
});
