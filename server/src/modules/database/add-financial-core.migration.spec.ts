import { DataSource } from 'typeorm';

jest.setTimeout(30_000);

describe('Financial core migration (SQLite)', () => {
  let source: DataSource;
  const customerId = '11111111-1111-4111-8111-111111111111';
  const accrualId = '22222222-2222-4222-8222-222222222222';
  const entryId = '33333333-3333-4333-8333-333333333333';
  const paymentId = '44444444-4444-4444-8444-444444444444';

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
      ({ name }) => name !== 'AddFinancialCore1789700000000',
    );
    await source.runMigrations();
    await source.query(
      `INSERT INTO customers (id, name, level) VALUES (?, 'Existing customer', 'bronze')`,
      [customerId],
    );
    await source.query(
      `INSERT INTO order_groups (id, "orderNumber", customer, "customerId") VALUES (1, 'EXISTING', '{}', ?)`,
      [customerId],
    );
    await source.query(
      `INSERT INTO orders (id, "documentNumber", "orderGroupId", "totalPrice") VALUES ('existing-document', 1, 1, 123.45)`,
    );
    source.migrations = migrations;
    await source.runMigrations();
  });

  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
    delete process.env.DB_TYPE;
  });

  it('creates four empty tables without changing existing data or ORM schema', async () => {
    for (const table of [
      'financial_accruals',
      'financial_accrual_entries',
      'financial_payments',
      'financial_payment_allocations',
    ]) {
      await expect(source.query(`SELECT * FROM "${table}"`)).resolves.toEqual(
        [],
      );
    }
    await expect(
      source.query(
        `SELECT "orderGroupId", "totalPrice" FROM orders WHERE id = 'existing-document'`,
      ),
    ).resolves.toEqual([{ orderGroupId: 1, totalPrice: 123.45 }]);
    expect(await source.query('PRAGMA foreign_key_check')).toEqual([]);
    expect((await source.driver.createSchemaBuilder().log()).upQueries).toEqual(
      [],
    );
  });

  it('enforces source, amount, foreign-key and unique constraints', async () => {
    await expect(
      source.query(
        `INSERT INTO financial_accruals (id, "customerId", "sourceType", title) VALUES (?, ?, 'order', 'Broken')`,
        ['bad-source', customerId],
      ),
    ).rejects.toThrow();
    await source.query(
      `INSERT INTO financial_accruals (id, "customerId", "sourceType", "orderGroupId", title) VALUES (?, ?, 'order', 1, 'Order')`,
      [accrualId, customerId],
    );
    await expect(
      source.query(
        `INSERT INTO financial_accruals (id, "customerId", "sourceType", "orderGroupId", title) VALUES ('duplicate', ?, 'order', 1, 'Duplicate')`,
        [customerId],
      ),
    ).rejects.toThrow();
    await expect(
      source.query(
        `INSERT INTO financial_accrual_entries (id, "accrualId", kind, "amountMinor", "effectiveDate", "requestId") VALUES ('zero', ?, 'initial', 0, '2026-09-22', 'zero-request')`,
        [accrualId],
      ),
    ).rejects.toThrow();
    await source.query(
      `INSERT INTO financial_accrual_entries (id, "accrualId", kind, "amountMinor", "effectiveDate", "requestId") VALUES (?, ?, 'initial', 100, '2026-09-22', 'entry-request')`,
      [entryId, accrualId],
    );
    await expect(
      source.query(
        `INSERT INTO financial_accrual_entries (id, "accrualId", kind, "amountMinor", "effectiveDate", "requestId") VALUES ('duplicate-request', ?, 'adjustment', 1, '2026-09-22', 'entry-request')`,
        [accrualId],
      ),
    ).rejects.toThrow();
    await expect(
      source.query(
        `INSERT INTO financial_payments (id, "customerId", "amountMinor", "paymentDate", method, "requestId") VALUES ('bad-payment', ?, -1, '2026-09-22', 'cash', 'bad-payment-request')`,
        [customerId],
      ),
    ).rejects.toThrow();
    await source.query(
      `INSERT INTO financial_payments (id, "customerId", "amountMinor", "paymentDate", method, "requestId") VALUES (?, ?, 100, '2026-09-22', 'cash', 'payment-request')`,
      [paymentId, customerId],
    );
    await expect(
      source.query(
        `INSERT INTO financial_payment_allocations (id, "paymentId", "accrualId", "amountMinor") VALUES ('bad-allocation', ?, 'missing-accrual', 1)`,
        [paymentId],
      ),
    ).rejects.toThrow();
    await source.query(
      `INSERT INTO financial_payment_allocations (id, "paymentId", "accrualId", "amountMinor") VALUES ('allocation', ?, ?, 100)`,
      [paymentId, accrualId],
    );
    await expect(
      source.query(`DELETE FROM financial_payments WHERE id = ?`, [paymentId]),
    ).rejects.toThrow();
    await expect(
      source.query(`DELETE FROM financial_accruals WHERE id = ?`, [accrualId]),
    ).rejects.toThrow();
    await expect(
      source.query(`DELETE FROM customers WHERE id = ?`, [customerId]),
    ).rejects.toThrow();
  });

  it('rolls back a failed financial transaction', async () => {
    await expect(
      source.transaction(async (manager) => {
        await manager.query(
          `INSERT INTO financial_payments (id, "customerId", "amountMinor", "paymentDate", method, "requestId") VALUES ('rollback-payment', ?, 100, '2026-09-22', 'card', 'rollback-request')`,
          [customerId],
        );
        await manager.query(
          `INSERT INTO financial_payment_allocations (id, "paymentId", "accrualId", "amountMinor") VALUES ('rollback-allocation', 'rollback-payment', ?, 0)`,
          [accrualId],
        );
      }),
    ).rejects.toThrow();
    await expect(
      source.query(
        `SELECT id FROM financial_payments WHERE id = 'rollback-payment'`,
      ),
    ).resolves.toEqual([]);
  });

  it('supports down and up again on the disposable database', async () => {
    await source.query(`DELETE FROM financial_payment_allocations`);
    await source.query(`DELETE FROM financial_accrual_entries`);
    await source.query(`DELETE FROM financial_payments`);
    await source.query(`DELETE FROM financial_accruals`);
    await source.undoLastMigration();
    await source.runMigrations();
    expect(await source.query('PRAGMA foreign_key_check')).toEqual([]);
    expect((await source.driver.createSchemaBuilder().log()).upQueries).toEqual(
      [],
    );
  });
});
