/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */
import { randomUUID } from 'crypto';
import type { DataSource as DataSourceType } from 'typeorm';
import type { Customer as CustomerType } from '../customers/entities/customer.entity';
import type { OrderGroup as OrderGroupType } from '../order-groups/entities/order-group.entity';
import type { CustomerFinanceService as ServiceType } from './customer-finance.service';

jest.setTimeout(30_000);

describe('CustomerFinanceService (SQLite)', () => {
  let source: DataSourceType;
  let service: ServiceType;
  let customer: CustomerType;
  let Customer: typeof import('../customers/entities/customer.entity').Customer;
  let CustomerLevel: typeof import('../customers/entities/customer.entity').CustomerLevel;
  let OrderGroup: typeof import('../order-groups/entities/order-group.entity').OrderGroup;
  let OrderStatus: typeof import('../order-groups/entities/order-group.entity').OrderStatus;
  let Order: typeof import('../orders/entities/order.entity').Order;
  let FinancialAccrual: typeof import('./entities/financial-accrual.entity').FinancialAccrual;
  let FinancialAccrualEntry: typeof import('./entities/financial-accrual-entry.entity').FinancialAccrualEntry;
  let FinancialPayment: typeof import('./entities/financial-payment.entity').FinancialPayment;
  let FinancialPaymentAllocation: typeof import('./entities/financial-payment-allocation.entity').FinancialPaymentAllocation;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    const typeorm = require('typeorm') as typeof import('typeorm');
    ({ Customer, CustomerLevel } =
      require('../customers/entities/customer.entity') as typeof import('../customers/entities/customer.entity'));
    ({ OrderGroup, OrderStatus } =
      require('../order-groups/entities/order-group.entity') as typeof import('../order-groups/entities/order-group.entity'));
    ({ Order } =
      require('../orders/entities/order.entity') as typeof import('../orders/entities/order.entity'));
    ({ FinancialAccrual } =
      require('./entities/financial-accrual.entity') as typeof import('./entities/financial-accrual.entity'));
    ({ FinancialAccrualEntry } =
      require('./entities/financial-accrual-entry.entity') as typeof import('./entities/financial-accrual-entry.entity'));
    ({ FinancialPayment } =
      require('./entities/financial-payment.entity') as typeof import('./entities/financial-payment.entity'));
    ({ FinancialPaymentAllocation } =
      require('./entities/financial-payment-allocation.entity') as typeof import('./entities/financial-payment-allocation.entity'));
    const { CustomerFinanceService } =
      require('./customer-finance.service') as typeof import('./customer-finance.service');
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
      name: 'Иван Петров',
      companyName: 'Альфа',
      level: CustomerLevel.BRONZE,
      attributes: { city: 'Москва' },
    });
    service = new CustomerFinanceService(source);
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
    await source.getRepository(Order).clear();
    await source.getRepository(OrderGroup).clear();
  });

  const createGroup = async (
    status: InstanceType<typeof OrderGroup>['status'],
    total: number,
    linked = true,
  ): Promise<OrderGroupType> => {
    const group = await source.getRepository(OrderGroup).save({
      orderNumber: `ORDER-${randomUUID()}`,
      customer: linked ? { id: customer.id, name: customer.name } : {},
      customerId: linked ? customer.id : null,
      status,
      managementVersion: 0,
      dueDate: null,
      customStatusId: null,
    });
    await source.getRepository(Order).save({
      name: 'Документ',
      documentNumber: 1,
      characteristics: {},
      totalPrice: total,
      orderGroup: group,
      dueDate: null,
      customStatusId: null,
      managementVersion: 0,
    });
    return group;
  };

  const createAccrual = async (
    group: OrderGroupType,
    status: 'active' | 'cancelled' = 'active',
  ) => {
    const accrual = await source.getRepository(FinancialAccrual).save({
      customerId: customer.id,
      sourceType: 'order',
      orderGroupId: group.id,
      title: group.orderNumber,
      status,
      version: 0,
    });
    if (Number(group.orders?.[0]?.totalPrice ?? 0) > 0) {
      await source.getRepository(FinancialAccrualEntry).save({
        accrualId: accrual.id,
        kind: 'initial',
        amountMinor: Math.round(Number(group.orders[0].totalPrice) * 100),
        effectiveDate: '2026-10-03',
        reason: null,
        reversesEntryId: null,
        requestId: randomUUID(),
      });
    }
    return accrual;
  };

  const createPayment = async (amountMinor: number) =>
    source.getRepository(FinancialPayment).save({
      customerId: customer.id,
      amountMinor,
      paymentDate: '2026-10-03',
      method: 'bank_transfer',
      externalReference: null,
      comment: null,
      status: 'posted',
      version: 0,
      requestId: randomUUID(),
      cancellationRequestId: null,
      cancelledAt: null,
      cancellationDate: null,
      cancellationReason: null,
    });

  it('returns customer data, statuses, totals and a positive balance', async () => {
    const group = await createGroup(OrderStatus.IN_PRODUCTION, 100);
    const accrual = await createAccrual(group);
    const payment = await createPayment(8_000);
    await source.getRepository(FinancialPaymentAllocation).save({
      paymentId: payment.id,
      accrualId: accrual.id,
      amountMinor: 4_000,
      status: 'active',
      releasedAt: null,
      releaseReason: null,
    });

    await expect(service.getPage(customer.id)).resolves.toMatchObject({
      customer: {
        id: customer.id,
        name: 'Иван Петров',
        companyName: 'Альфа',
        city: 'Москва',
      },
      unallocatedBalance: '40.00',
      revision: expect.stringMatching(/^[a-f0-9]{64}$/),
      availableSystemStatuses: [
        'draft',
        'in_production',
        'completed',
        'cancelled',
      ],
      orders: [
        {
          id: group.id,
          systemStatus: 'in_production',
          closed: false,
          allocationAvailable: true,
          total: '100.00',
          paid: '40.00',
          debt: '60.00',
          missingToHalf: '10.00',
          financialStatus: 'partially_paid',
        },
      ],
    });
  });

  it('keeps closed, cancelled-accrual and missing-accrual orders visible but unavailable', async () => {
    const closed = await createGroup(OrderStatus.COMPLETED, 100);
    await createAccrual(closed);
    const cancelledAccrual = await createGroup(OrderStatus.IN_PRODUCTION, 50);
    await createAccrual(cancelledAccrual, 'cancelled');
    const missingAccrual = await createGroup(OrderStatus.DRAFT, 0);
    const unlinked = await createGroup(OrderStatus.DRAFT, 25, false);
    await createPayment(10_000);

    const page = await service.getPage(customer.id);
    expect(page.orders).toHaveLength(3);
    expect(page.orders.find((item) => item.id === unlinked.id)).toBeUndefined();
    expect(page.orders.find((item) => item.id === closed.id)).toMatchObject({
      closed: true,
      allocationAvailable: false,
    });
    expect(
      page.orders.find((item) => item.id === cancelledAccrual.id),
    ).toMatchObject({
      accrualStatus: 'cancelled',
      allocationAvailable: false,
      financialStatus: 'unpaid',
    });
    expect(
      page.orders.find((item) => item.id === missingAccrual.id),
    ).toMatchObject({
      accrualId: null,
      allocationAvailable: false,
      total: '0.00',
      debt: '0.00',
      missingToHalf: '0.00',
      financialStatus: 'paid',
    });
  });

  it.each([
    [5_000, 5_000, '0.00'],
    [5_000, 6_000, '-10.00'],
  ])(
    'returns signed balance for payment %i and allocation %i',
    async (paymentMinor, allocationMinor, expectedBalance) => {
      const group = await createGroup(OrderStatus.IN_PRODUCTION, 100);
      const accrual = await createAccrual(group);
      const payment = await createPayment(paymentMinor);
      await source.getRepository(FinancialPaymentAllocation).save({
        paymentId: payment.id,
        accrualId: accrual.id,
        amountMinor: allocationMinor,
        status: 'active',
        releasedAt: null,
        releaseReason: null,
      });

      const page = await service.getPage(customer.id);
      expect(page.unallocatedBalance).toBe(expectedBalance);
      expect(page.orders[0].allocationAvailable).toBe(false);
    },
  );
});
