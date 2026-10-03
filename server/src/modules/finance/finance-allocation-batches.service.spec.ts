/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment */
import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import type { DataSource as DataSourceType } from 'typeorm';
import type { Customer as CustomerType } from '../customers/entities/customer.entity';
import type { FinancialPayment as FinancialPaymentType } from './entities/financial-payment.entity';
import type { FinanceAllocationBatchesService as ServiceType } from './finance-allocation-batches.service';

jest.setTimeout(30_000);

describe('FinanceAllocationBatchesService (SQLite)', () => {
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
  let FinancialAllocationBatch: typeof import('./entities/financial-allocation-batch.entity').FinancialAllocationBatch;
  let getCustomerFinanceRevision: typeof import('./customer-finance-revision').getCustomerFinanceRevision;

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
    ({ FinancialAllocationBatch } =
      require('./entities/financial-allocation-batch.entity') as typeof import('./entities/financial-allocation-batch.entity'));
    ({ getCustomerFinanceRevision } =
      require('./customer-finance-revision') as typeof import('./customer-finance-revision'));
    const { FinanceAllocationBatchesService } =
      require('./finance-allocation-batches.service') as typeof import('./finance-allocation-batches.service');
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
      level: CustomerLevel.BRONZE,
      attributes: {},
    });
    service = new FinanceAllocationBatchesService(source);
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
    await source.getRepository(Order).clear();
    await source.getRepository(OrderGroup).clear();
  });

  const createOrder = async (
    total: number,
    status: InstanceType<
      typeof OrderGroup
    >['status'] = OrderStatus.IN_PRODUCTION,
  ) => {
    const group = await source.getRepository(OrderGroup).save({
      orderNumber: `ORDER-${randomUUID()}`,
      customer: { id: customer.id, name: customer.name },
      customerId: customer.id,
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
    const accrual = await source.getRepository(FinancialAccrual).save({
      customerId: customer.id,
      sourceType: 'order',
      orderGroupId: group.id,
      title: group.orderNumber,
      status: 'active',
      version: 0,
    });
    await source.getRepository(FinancialAccrualEntry).save({
      accrualId: accrual.id,
      kind: 'initial',
      amountMinor: Math.round(total * 100),
      effectiveDate: '2026-10-01',
      reason: null,
      reversesEntryId: null,
      requestId: randomUUID(),
    });
    return { group, accrual };
  };

  const createPayment = (
    amountMinor: number,
    paymentDate: string,
  ): Promise<FinancialPaymentType> =>
    source.getRepository(FinancialPayment).save({
      customerId: customer.id,
      amountMinor,
      paymentDate,
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

  const command = async (
    allocations: Array<{
      accrualId?: string;
      orderGroupId?: number;
      amount: string;
    }>,
    requestId = randomUUID(),
  ) => ({
    customerId: customer.id,
    requestId,
    expectedRevision: await getCustomerFinanceRevision(
      source.manager,
      customer.id,
    ),
    comment: 'Пакетное распределение',
    allocations,
  });

  it('uses FIFO and splits one order amount between two payments', async () => {
    const { group, accrual } = await createOrder(100);
    const oldest = await createPayment(3_000, '2026-09-01');
    const newest = await createPayment(4_000, '2026-09-02');

    const result = await service.create(
      await command([{ orderGroupId: group.id, amount: '50.00' }]),
    );

    expect(result).toMatchObject({
      total: '50.00',
      balanceAfter: '20.00',
      orders: [
        {
          orderGroupId: group.id,
          allocated: '50.00',
          newDebt: '50.00',
        },
      ],
    });
    expect(result.paymentSources).toEqual([
      expect.objectContaining({
        paymentId: oldest.id,
        accrualId: accrual.id,
        amount: '30.00',
      }),
      expect.objectContaining({
        paymentId: newest.id,
        accrualId: accrual.id,
        amount: '20.00',
      }),
    ]);
  });

  it('returns the same result for an idempotent request', async () => {
    const { accrual } = await createOrder(100);
    await createPayment(10_000, '2026-09-01');
    const requestId = randomUUID();
    const dto = await command(
      [{ accrualId: accrual.id, amount: '25.55' }],
      requestId,
    );

    const first = await service.create(dto);
    const replay = await service.create(dto);

    expect(replay).toEqual(first);
    expect(await source.getRepository(FinancialAllocationBatch).count()).toBe(
      1,
    );
    expect(await source.getRepository(FinancialPaymentAllocation).count()).toBe(
      1,
    );
  });

  it('returns one batch for concurrent retries with the same requestId', async () => {
    const { accrual } = await createOrder(100);
    await createPayment(10_000, '2026-09-01');
    const dto = await command(
      [{ accrualId: accrual.id, amount: '25.00' }],
      randomUUID(),
    );

    const [first, second] = await Promise.all([
      service.create(dto),
      service.create(dto),
    ]);

    expect(second.id).toBe(first.id);
    expect(await source.getRepository(FinancialAllocationBatch).count()).toBe(
      1,
    );
  });

  it('rolls back every row when one order exceeds its debt', async () => {
    const first = await createOrder(100);
    const second = await createOrder(10);
    await createPayment(20_000, '2026-09-01');
    const dto = await command([
      { accrualId: first.accrual.id, amount: '50.00' },
      { accrualId: second.accrual.id, amount: '10.01' },
    ]);

    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(await source.getRepository(FinancialAllocationBatch).count()).toBe(
      0,
    );
    expect(await source.getRepository(FinancialPaymentAllocation).count()).toBe(
      0,
    );
  });

  it('rejects an allocation larger than the positive balance', async () => {
    const { accrual } = await createOrder(100);
    await createPayment(2_000, '2026-09-01');

    await expect(
      service.create(
        await command([{ accrualId: accrual.id, amount: '20.01' }]),
      ),
    ).rejects.toThrow('Insufficient unallocated balance');
  });

  it('rejects overpayment even when the customer has enough balance', async () => {
    const { accrual } = await createOrder(10);
    await createPayment(20_000, '2026-09-01');

    await expect(
      service.create(
        await command([{ accrualId: accrual.id, amount: '10.01' }]),
      ),
    ).rejects.toThrow('Allocation exceeds order debt');
  });

  it('rejects a closed order', async () => {
    const { accrual } = await createOrder(100, OrderStatus.COMPLETED);
    await createPayment(10_000, '2026-09-01');

    await expect(
      service.create(
        await command([{ accrualId: accrual.id, amount: '10.00' }]),
      ),
    ).rejects.toThrow('Order is closed or cancelled');
  });

  it('returns Conflict when the financial snapshot changed', async () => {
    const { accrual } = await createOrder(100);
    const payment = await createPayment(10_000, '2026-09-01');
    const dto = await command([{ accrualId: accrual.id, amount: '10.00' }]);
    await source
      .getRepository(FinancialPayment)
      .update(payment.id, { version: 1 });

    await expect(service.create(dto)).rejects.toThrow(
      'Customer finance data was changed; reload and retry',
    );
  });

  it('allows only one of two concurrent commands with the same revision', async () => {
    const { accrual } = await createOrder(100);
    await createPayment(10_000, '2026-09-01');
    const expectedRevision = await getCustomerFinanceRevision(
      source.manager,
      customer.id,
    );
    const makeDto = () => ({
      customerId: customer.id,
      requestId: randomUUID(),
      expectedRevision,
      allocations: [{ accrualId: accrual.id, amount: '60.00' }],
    });

    const results = await Promise.allSettled([
      service.create(makeDto()),
      service.create(makeDto()),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({
      status: 'rejected',
      reason: expect.any(ConflictException),
    });
    expect(await source.getRepository(FinancialAllocationBatch).count()).toBe(
      1,
    );
    expect(
      await source
        .getRepository(FinancialPaymentAllocation)
        .sum('amountMinor', {}),
    ).toBe(6_000);
  });

  it('ignores zero rows and rejects duplicate orders', async () => {
    const { group, accrual } = await createOrder(100);
    await createPayment(10_000, '2026-09-01');
    const dto = await command([
      { accrualId: accrual.id, amount: '0.00' },
      { orderGroupId: group.id, amount: '10.00' },
    ]);
    await expect(service.create(dto)).resolves.toMatchObject({
      total: '10.00',
    });

    const duplicateDto = await command([
      { accrualId: accrual.id, amount: '1.00' },
      { orderGroupId: group.id, amount: '1.00' },
    ]);
    await expect(service.create(duplicateDto)).rejects.toThrow(
      'Duplicate orders are not allowed',
    );
  });
});
