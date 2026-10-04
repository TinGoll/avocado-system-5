import { DataSource } from 'typeorm';

jest.setTimeout(30_000);

describe('Order group customer link migration (SQLite)', () => {
  let source: DataSource;

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    source = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      synchronize: false,
      entities: [__dirname + '/../**/*.entity.ts'],
      migrations: [__dirname + '/migrations/sqlite/*.ts'],
      migrationsTransactionMode: 'each',
    });
    await source.initialize();
    const migrations = source.migrations;
    source.migrations = migrations.filter(
      ({ name }) => name !== 'AddOrderGroupCustomerLink1789600000000',
    );
    await source.runMigrations();
    await source.query(
      `INSERT INTO customers (id, name, level) VALUES
       ('11111111-1111-4111-8111-111111111111', 'Valid customer', 'bronze')`,
    );
    await source.query(
      `INSERT INTO order_groups (id, "orderNumber", customer) VALUES
       (1, 'VALID', '{"id":"11111111-1111-4111-8111-111111111111","name":"Old name"}'),
       (2, 'MISSING', '{"id":"22222222-2222-4222-8222-222222222222","name":"Missing"}'),
       (3, 'BROKEN', '{broken')`,
    );
    await source.query(
      `INSERT INTO orders (id, "documentNumber", "orderGroupId", "totalPrice") VALUES ('document', 1, 1, 123.45)`,
    );
    source.migrations = migrations;
    await source.runMigrations();
  });

  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
    delete process.env.DB_TYPE;
  });

  it('backfills only an existing snapshot customer and preserves legacy data', async () => {
    expect(
      await source.query(
        `SELECT id, "customerId", customer FROM order_groups ORDER BY id`,
      ),
    ).toEqual([
      expect.objectContaining({
        id: 1,
        customerId: '11111111-1111-4111-8111-111111111111',
        customer:
          '{"id":"11111111-1111-4111-8111-111111111111","name":"Old name"}',
      }),
      expect.objectContaining({ id: 2, customerId: null }),
      expect.objectContaining({ id: 3, customerId: null, customer: '{broken' }),
    ]);
    expect(
      await source.query(
        `SELECT "orderGroupId", "totalPrice" FROM orders WHERE id = 'document'`,
      ),
    ).toEqual([{ orderGroupId: 1, totalPrice: 123.45 }]);
    expect(await source.query('PRAGMA foreign_key_check')).toEqual([]);
  });

  it('enforces the customer foreign key', async () => {
    await expect(
      source.query(
        `UPDATE order_groups SET "customerId" = '33333333-3333-4333-8333-333333333333' WHERE id = 2`,
      ),
    ).rejects.toThrow();
    await expect(
      source.query(
        `DELETE FROM customers WHERE id = '11111111-1111-4111-8111-111111111111'`,
      ),
    ).rejects.toThrow();
  });
});
