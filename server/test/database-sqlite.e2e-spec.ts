/* eslint-disable @typescript-eslint/no-require-imports */
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { DataSource } from 'typeorm';

describe('SQLite database', () => {
  let dataSource: DataSource;
  let temporaryDirectory: string;

  beforeAll(async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'avocado-sqlite-'));
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = join(temporaryDirectory, 'avocado.sqlite');

    const dataSourceModule = require('../src/modules/database/data-source') as {
      default: DataSource;
    };
    dataSource = dataSourceModule.default;
    await dataSource.initialize();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
    await rm(temporaryDirectory, { recursive: true, force: true });
    delete process.env.DB_TYPE;
    delete process.env.DB_PATH;
  });

  it('applies the baseline once and supports all entity metadata', async () => {
    expect(dataSource.entityMetadatas).toHaveLength(30);
    expect(await dataSource.runMigrations()).toEqual([]);
    const schemaChanges = await dataSource.driver.createSchemaBuilder().log();
    expect(schemaChanges.upQueries).toEqual([]);

    const tables = await dataSource.query<Array<{ name: string }>>(
      "SELECT name FROM sqlite_master WHERE type = 'table'",
    );
    expect(tables.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'customers',
        'order_groups',
        'orders',
        'order_items',
        'price_modifiers',
        'product_templates',
        'client_errors',
        'financial_accruals',
        'financial_accrual_entries',
        'financial_payments',
        'financial_payment_allocations',
      ]),
    );
  });

  it('round-trips nested JSON and hydrates an empty object default', async () => {
    const { Panel } =
      require('../src/modules/panels/entities/panel.entity') as typeof import('../src/modules/panels/entities/panel.entity');
    const { FacadeProfile } =
      require('../src/modules/facade-profiles/entities/facade-profile.entity') as typeof import('../src/modules/facade-profiles/entities/facade-profile.entity');
    const nestedJson = {
      nested: { enabled: true, dimensions: [1, 2, 3] },
      labels: ['one', 'two'],
    };

    const panelRepository = dataSource.getRepository(Panel);
    const panel = await panelRepository.save(
      panelRepository.create({
        name: 'Nested JSON',
        characteristics: nestedJson as never,
      }),
    );
    expect(
      (await panelRepository.findOneByOrFail({ id: panel.id })).characteristics,
    ).toEqual(nestedJson);

    const facadeRepository = dataSource.getRepository(FacadeProfile);
    await facadeRepository.insert({ name: 'Default JSON' });
    expect(
      (await facadeRepository.findOneByOrFail({ name: 'Default JSON' }))
        .characteristics,
    ).toEqual({});
  });

  it('stores valid enums and rejects invalid raw values with CHECK', async () => {
    const { Customer, CustomerLevel } =
      require('../src/modules/customers/entities/customer.entity') as typeof import('../src/modules/customers/entities/customer.entity');
    const repository = dataSource.getRepository(Customer);

    for (const level of Object.values(CustomerLevel)) {
      const customer = await repository.save(
        repository.create({ name: `Customer ${level}`, level }),
      );
      const savedCustomer = await repository.findOneByOrFail({
        id: customer.id,
      });
      expect(savedCustomer.level).toBe(level);
      expect(savedCustomer.attributes).toEqual({});
    }

    const enumCases = [
      {
        table: 'order_groups',
        column: 'status',
        values: ['draft', 'in_production', 'completed', 'cancelled'],
        insert: (value: string, index: number) =>
          dataSource.query(
            'INSERT INTO "order_groups" ("orderNumber", "customer", "status") VALUES (?, ?, ?)',
            [`ENUM-ORDER-${index}`, '{}', value],
          ),
      },
      {
        table: 'production_operations',
        column: 'calculationMethod',
        values: ['per_item', 'area', 'volume'],
        insert: (value: string, index: number) =>
          dataSource.query(
            'INSERT INTO "production_operations" ("id", "name", "calculationMethod", "calculationFormula", "displayNameTemplate", "costPerUnit") VALUES (?, ?, ?, ?, ?, ?)',
            [
              `operation-${index}`,
              `Operation ${index}`,
              value,
              'item.quantity',
              `Operation ${index}`,
              1,
            ],
          ),
      },
      {
        table: 'product_templates',
        column: 'customerPricingMethod',
        values: ['per_item', 'linear_meter', 'area', 'volume'],
        insert: (value: string, index: number) =>
          dataSource.query(
            'INSERT INTO "product_templates" ("id", "name", "customerPricingMethod") VALUES (?, ?, ?)',
            [`enum-template-${index}`, `Enum template ${index}`, value],
          ),
      },
      {
        table: 'price_modifiers',
        column: 'type',
        values: ['percentage', 'fixed_amount'],
        insert: (value: string, index: number) =>
          dataSource.query(
            'INSERT INTO "price_modifiers" ("id", "name", "type", "value", "conditions") VALUES (?, ?, ?, ?, ?)',
            [`modifier-${index}`, `Modifier ${index}`, value, 1, '{}'],
          ),
      },
    ];

    for (const enumCase of enumCases) {
      for (const [index, value] of enumCase.values.entries()) {
        await enumCase.insert(value, index);
      }
      const rows = await dataSource.query<Array<{ value: string }>>(
        `SELECT "${enumCase.column}" AS value FROM "${enumCase.table}"`,
      );
      expect(rows.map(({ value }) => value)).toEqual(
        expect.arrayContaining(enumCase.values),
      );
    }

    await expect(
      dataSource.query(
        'INSERT INTO "customers" ("id", "name", "level") VALUES (?, ?, ?)',
        ['00000000-0000-4000-8000-000000000000', 'Invalid', 'platinum'],
      ),
    ).rejects.toThrow();
  });

  it('enforces relation cascades and onDelete behavior', async () => {
    const { Order } =
      require('../src/modules/orders/entities/order.entity') as typeof import('../src/modules/orders/entities/order.entity');
    const { ProductTemplate } =
      require('../src/modules/products/entities/product-template.entity') as typeof import('../src/modules/products/entities/product-template.entity');
    const templateRepository = dataSource.getRepository(ProductTemplate);
    const template = await templateRepository.save(
      templateRepository.create({ name: 'Template for relation test' }),
    );

    const orderRepository = dataSource.getRepository(Order);
    const order = await orderRepository.save(
      orderRepository.create({
        name: 'Cascade order',
        documentNumber: 1,
        items: [
          {
            quantity: 1,
            snapshot: {
              name: 'Snapshot',
              baseCustomerPrice: 10,
              attributes: {},
              customerPricingMethod: 'per_item',
              defaultCharacteristics: {},
            },
            template,
          },
        ],
      }),
    );
    expect(order.items).toHaveLength(1);

    await templateRepository.remove(template);
    const rows = await dataSource.query<Array<{ templateId: string | null }>>(
      'SELECT "templateId" FROM "order_items" WHERE "orderId" = ?',
      [order.id],
    );
    expect(rows[0].templateId).toBeNull();

    await orderRepository.remove(order);
    await expect(
      dataSource.query('SELECT 1 FROM "order_items" WHERE "orderId" = ?', [
        order.id,
      ]),
    ).resolves.toEqual([]);
  });

  it('deduplicates scheduled notifications and keeps failed events pending', async () => {
    const { OrderGroup, OrderStatus } =
      require('../src/modules/order-groups/entities/order-group.entity') as typeof import('../src/modules/order-groups/entities/order-group.entity');
    const { NotificationRule } =
      require('../src/modules/notifications/entities/notification-rule.entity') as typeof import('../src/modules/notifications/entities/notification-rule.entity');
    const { Notification } =
      require('../src/modules/notifications/entities/notification.entity') as typeof import('../src/modules/notifications/entities/notification.entity');
    const { OrderManagementEvent } =
      require('../src/modules/order-management/entities/order-management-event.entity') as typeof import('../src/modules/order-management/entities/order-management-event.entity');
    const { NotificationsService } =
      require('../src/modules/notifications/notifications.service') as typeof import('../src/modules/notifications/notifications.service');
    const { NotificationSchedulerService } =
      require('../src/modules/notifications/notification-scheduler.service') as typeof import('../src/modules/notifications/notification-scheduler.service');

    const today = new Date().toISOString().slice(0, 10);
    const group = await dataSource.getRepository(OrderGroup).save({
      orderNumber: 'NOTIFY-1',
      customer: {},
      status: OrderStatus.IN_PRODUCTION,
      dueDate: today,
      customStatusId: null,
      managementVersion: 0,
    });
    const rules = dataSource.getRepository(NotificationRule);
    await rules.save({
      name: 'Due today',
      enabled: true,
      revision: 1,
      scope: 'group',
      trigger: 'due_soon',
      conditions: { days: 0 },
      repeat: 'once',
      messageTemplate: 'Заказ {{order.number}}',
      severity: 'warning',
      activatedAt: new Date(0),
    });
    const service = new NotificationsService(dataSource);
    const scheduler = new NotificationSchedulerService(dataSource, service);
    await scheduler.run();
    await scheduler.run();
    const notificationRepository = dataSource.getRepository(Notification);
    expect(await notificationRepository.count()).toBe(1);
    expect(scheduler.state().lastCreatedCount).toBe(0);
    const page = await service.feed({ limit: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.meta.nextCursor).toBeNull();
    await service.setRead(page.items[0].id, { read: true });
    const readAt = (
      await notificationRepository.findOneByOrFail({
        id: page.items[0].id,
      })
    ).readAt;
    await service.setRead(page.items[0].id, { read: true });
    expect(
      (await notificationRepository.findOneByOrFail({ id: page.items[0].id }))
        .readAt,
    ).toEqual(readAt);

    group.dueDate = '2999-01-01';
    await dataSource.getRepository(OrderGroup).save(group);
    await scheduler.run();
    expect(
      (await notificationRepository.findOneByOrFail({ id: page.items[0].id }))
        .resolvedAt,
    ).not.toBeNull();

    const invalidRule = await rules.save({
      name: 'Invalid event template',
      enabled: true,
      revision: 1,
      scope: 'group',
      trigger: 'lifecycle_changed',
      conditions: {},
      repeat: 'once',
      messageTemplate: '{{unsupported.value}}',
      severity: 'error',
      activatedAt: new Date(0),
    });
    const event = await dataSource.getRepository(OrderManagementEvent).save({
      orderGroupId: group.id,
      orderId: null,
      type: 'lifecycle_changed',
      before: { status: OrderStatus.DRAFT },
      after: { status: OrderStatus.IN_PRODUCTION },
      targetSnapshot: {
        orderNumber: group.orderNumber,
        documentNumber: null,
        documentName: null,
      },
      reason: null,
      notificationProcessedAt: null,
    });
    await scheduler.run();
    expect(
      (
        await dataSource
          .getRepository(OrderManagementEvent)
          .findOneByOrFail({ id: event.id })
      ).notificationProcessedAt,
    ).toBeNull();
    expect(scheduler.state().lastError).toContain('unsupported variable');
    await rules.delete(invalidRule.id);
  });
});
