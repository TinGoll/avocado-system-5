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
    expect(dataSource.entityMetadatas).toHaveLength(16);
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
      expect(
        (await repository.findOneByOrFail({ id: customer.id })).level,
      ).toBe(level);
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
  });
});
