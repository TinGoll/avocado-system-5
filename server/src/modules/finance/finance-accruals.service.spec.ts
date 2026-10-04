/* eslint-disable @typescript-eslint/no-require-imports */
import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { DataSource as DataSourceType } from 'typeorm';
import type { Customer as CustomerType } from '../customers/entities/customer.entity';
import type { FinanceAccrualsService as FinanceAccrualsServiceType } from './finance-accruals.service';

jest.setTimeout(30_000);

describe('FinanceAccrualsService (SQLite)', () => {
  let source: DataSourceType;
  let service: FinanceAccrualsServiceType;
  let customer: CustomerType;
  let Customer: typeof import('../customers/entities/customer.entity').Customer;
  let CustomerLevel: typeof import('../customers/entities/customer.entity').CustomerLevel;
  let OrderGroup: typeof import('../order-groups/entities/order-group.entity').OrderGroup;
  let OrderGroupStatus: typeof import('../order-groups/entities/order-group.entity').OrderStatus;
  let Order: typeof import('../orders/entities/order.entity').Order;
  let FinancialAccrualEntry: typeof import('./entities/financial-accrual-entry.entity').FinancialAccrualEntry;
  let FinancialAccrual: typeof import('./entities/financial-accrual.entity').FinancialAccrual;
  let FinancialPaymentAllocation: typeof import('./entities/financial-payment-allocation.entity').FinancialPaymentAllocation;
  let FinancialPaymentAllocationStatus: typeof import('./entities/financial-payment-allocation.entity').FinancialPaymentAllocationStatus;
  let FinancialPayment: typeof import('./entities/financial-payment.entity').FinancialPayment;
  let FinancialPaymentMethod: typeof import('./entities/financial-payment.entity').FinancialPaymentMethod;
  let FinancialPaymentStatus: typeof import('./entities/financial-payment.entity').FinancialPaymentStatus;
  let OrderManagementService: typeof import('../order-management/order-management.service').OrderManagementService;
  let OrderManagementEventService: typeof import('../order-management/order-management-event.service').OrderManagementEventService;
  let groupSequence = 0;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    const typeorm = require('typeorm') as typeof import('typeorm');
    ({ Customer, CustomerLevel } =
      require('../customers/entities/customer.entity') as typeof import('../customers/entities/customer.entity'));
    ({ OrderGroup, OrderStatus: OrderGroupStatus } =
      require('../order-groups/entities/order-group.entity') as typeof import('../order-groups/entities/order-group.entity'));
    ({ Order } =
      require('../orders/entities/order.entity') as typeof import('../orders/entities/order.entity'));
    ({ FinancialAccrualEntry } =
      require('./entities/financial-accrual-entry.entity') as typeof import('./entities/financial-accrual-entry.entity'));
    ({ FinancialAccrual } =
      require('./entities/financial-accrual.entity') as typeof import('./entities/financial-accrual.entity'));
    ({ FinancialPaymentAllocation, FinancialPaymentAllocationStatus } =
      require('./entities/financial-payment-allocation.entity') as typeof import('./entities/financial-payment-allocation.entity'));
    ({ FinancialPayment, FinancialPaymentMethod, FinancialPaymentStatus } =
      require('./entities/financial-payment.entity') as typeof import('./entities/financial-payment.entity'));
    ({ OrderManagementService } =
      require('../order-management/order-management.service') as typeof import('../order-management/order-management.service'));
    ({ OrderManagementEventService } =
      require('../order-management/order-management-event.service') as typeof import('../order-management/order-management-event.service'));
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
    customer = await source.getRepository(Customer).save({
      name: 'Finance customer',
      level: CustomerLevel.BRONZE,
      attributes: {},
    });
    service = new FinanceAccrualsService(
      source,
      source.getRepository(FinancialAccrual),
    );
  });

  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
    delete process.env.DB_TYPE;
  });

  const createGroup = async (
    totals: number[],
    customerId: string | null = customer.id,
  ) => {
    groupSequence += 1;
    const group = await source.getRepository(OrderGroup).save({
      orderNumber: `FIN-${groupSequence}`,
      customer: customerId ? { id: customerId, name: customer.name } : {},
      customerId,
    });
    for (const [index, totalPrice] of totals.entries()) {
      await source.getRepository(Order).save({
        documentNumber: index + 1,
        characteristics: {},
        totalPrice,
        orderGroup: group,
      });
    }
    return group;
  };

  it('creates one order accrual from the server-side document total', async () => {
    const group = await createGroup([10.1, 20.2]);
    const dto = {
      orderGroupId: group.id,
      effectiveDate: '2026-09-22',
      requestId: '11111111-1111-4111-8111-111111111111',
    };

    const created = await service.createFromOrder(dto);
    const replay = await service.createFromOrder(dto);

    expect(created).toMatchObject({
      customerId: customer.id,
      orderGroupId: group.id,
      amountMinor: 3030,
      amount: '30.30',
      version: 0,
    });
    expect(replay).toEqual(created);
    expect(
      await source.getRepository(FinancialAccrualEntry).countBy({
        accrualId: created.id,
      }),
    ).toBe(1);
    await expect(
      service.createFromOrder({
        ...dto,
        requestId: '11111111-1111-4111-8111-111111111112',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects order accruals without a customer or positive total', async () => {
    const withoutCustomer = await createGroup([10], null);
    const zero = await createGroup([0]);

    await expect(
      service.createFromOrder({
        orderGroupId: withoutCustomer.id,
        effectiveDate: '2026-09-22',
        requestId: '22222222-2222-4222-8222-222222222221',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    await expect(
      service.createFromOrder({
        orderGroupId: zero.id,
        effectiveDate: '2026-09-22',
        requestId: '22222222-2222-4222-8222-222222222222',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('does not create an accrual during an order lifecycle transition', async () => {
    const group = await createGroup([10]);
    const management = new OrderManagementService(
      source,
      new OrderManagementEventService(),
    );

    await management.updateGroup(group.id, {
      status: OrderGroupStatus.IN_PRODUCTION,
      expectedVersion: 0,
    });

    expect(
      await source.getRepository(FinancialAccrual).countBy({
        orderGroupId: group.id,
      }),
    ).toBe(0);
  });

  it('creates a manual accrual and rejects conflicting request replay', async () => {
    const dto = {
      customerId: customer.id,
      title: 'Manual service',
      amount: '12.34',
      effectiveDate: '2026-09-22',
      reason: 'Service comment',
      requestId: '33333333-3333-4333-8333-333333333333',
    };
    const created = await service.createManual(dto);
    expect(await service.createManual(dto)).toEqual(created);
    await expect(
      service.createManual({ ...dto, amount: '12.35' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('adjusts, synchronizes and enforces optimistic versions', async () => {
    const group = await createGroup([100]);
    const accrual = await service.createFromOrder({
      orderGroupId: group.id,
      effectiveDate: '2026-09-22',
      requestId: '44444444-4444-4444-8444-444444444441',
    });
    const adjusted = await service.adjust(accrual.id, {
      amount: '-10.00',
      reason: 'Discount',
      effectiveDate: '2026-09-23',
      expectedVersion: 0,
      requestId: '44444444-4444-4444-8444-444444444442',
    });
    expect(adjusted).toMatchObject({ amountMinor: 9000, version: 1 });
    await expect(
      service.adjust(accrual.id, {
        amount: '1.00',
        reason: 'Stale',
        effectiveDate: '2026-09-23',
        expectedVersion: 0,
        requestId: '44444444-4444-4444-8444-444444444443',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    await source
      .getRepository(Order)
      .update({ orderGroup: { id: group.id } }, { totalPrice: 120 });
    const syncedUp = await service.syncOrderTotal(accrual.id, {
      effectiveDate: '2026-09-24',
      expectedVersion: 1,
      requestId: '44444444-4444-4444-8444-444444444444',
    });
    expect(syncedUp).toMatchObject({ amountMinor: 12000, version: 2 });
    const noChange = await service.syncOrderTotal(accrual.id, {
      effectiveDate: '2026-09-25',
      expectedVersion: 2,
      requestId: '44444444-4444-4444-8444-444444444445',
    });
    expect(noChange).toMatchObject({ amountMinor: 12000, version: 2 });
    await source
      .getRepository(Order)
      .update({ orderGroup: { id: group.id } }, { totalPrice: 110 });
    const syncedDown = await service.syncOrderTotal(accrual.id, {
      effectiveDate: '2026-09-26',
      expectedVersion: 2,
      requestId: '44444444-4444-4444-8444-444444444446',
    });
    expect(syncedDown).toMatchObject({ amountMinor: 11000, version: 3 });
    await expect(
      service.syncOrderTotal(accrual.id, {
        effectiveDate: '2026-09-27',
        expectedVersion: 2,
        requestId: '44444444-4444-4444-8444-444444444447',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not reduce below active allocations and rolls back the command', async () => {
    const accrual = await service.createManual({
      customerId: customer.id,
      title: 'Allocated service',
      amount: '100.00',
      effectiveDate: '2026-09-22',
      requestId: '55555555-5555-4555-8555-555555555551',
    });
    const payment = await source.getRepository(FinancialPayment).save({
      customerId: customer.id,
      amountMinor: 8000,
      paymentDate: '2026-09-22',
      method: FinancialPaymentMethod.CASH,
      status: FinancialPaymentStatus.POSTED,
      version: 0,
      requestId: '55555555-5555-4555-8555-555555555552',
    });
    await source.getRepository(FinancialPaymentAllocation).save({
      paymentId: payment.id,
      accrualId: accrual.id,
      amountMinor: 8000,
      status: FinancialPaymentAllocationStatus.ACTIVE,
    });

    await expect(
      service.adjust(accrual.id, {
        amount: '-30.00',
        reason: 'Too low',
        effectiveDate: '2026-09-23',
        expectedVersion: 0,
        requestId: '55555555-5555-4555-8555-555555555553',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(
      await source.getRepository(FinancialAccrualEntry).countBy({
        accrualId: accrual.id,
      }),
    ).toBe(1);
    expect(
      await source.getRepository(FinancialAccrual).findOneByOrFail({
        id: accrual.id,
      }),
    ).toMatchObject({ version: 0, status: 'active' });
  });

  it('cancels with an immutable reversal and safely replays it', async () => {
    const accrual = await service.createManual({
      customerId: customer.id,
      title: 'Cancelled service',
      amount: '50.00',
      effectiveDate: '2026-09-22',
      requestId: '66666666-6666-4666-8666-666666666661',
    });
    const dto = {
      reason: 'Created by mistake',
      effectiveDate: '2026-09-23',
      expectedVersion: 0,
      requestId: '66666666-6666-4666-8666-666666666662',
    };
    const cancelled = await service.cancel(accrual.id, dto);
    expect(cancelled).toMatchObject({
      amountMinor: 0,
      amount: '0.00',
      version: 1,
      status: 'cancelled',
    });
    expect(await service.cancel(accrual.id, dto)).toEqual(cancelled);
    expect(
      await source.getRepository(FinancialAccrualEntry).countBy({
        accrualId: accrual.id,
      }),
    ).toBe(2);
  });
});
