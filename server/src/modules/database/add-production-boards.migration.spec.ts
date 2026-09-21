import { DataSource } from 'typeorm';

describe('AddProductionBoards1788900000000 (SQLite)', () => {
  let source: DataSource;

  beforeAll(async () => {
    source = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      synchronize: false,
      migrationsTransactionMode: 'each',
      migrations: [__dirname + '/migrations/sqlite/*.ts'],
    });
    await source.initialize();
    const migrations = source.migrations;
    source.migrations = migrations.filter(
      (migration) => migration.name !== 'AddProductionBoards1788900000000',
    );
    await source.runMigrations();
    await source.query(
      `INSERT INTO order_groups (id, "orderNumber", status) VALUES (1, 'EXISTING', 'in_production')`,
    );
    await source.query(
      `INSERT INTO orders (id, "documentNumber", "orderGroupId", "totalPrice") VALUES ('legacy', 1, 1, 123.45)`,
    );
    source.migrations = migrations;
    await source.runMigrations();
  });

  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
  });

  it('adds empty tables without manufacturing production state or changing existing orders', async () => {
    expect(await source.query('SELECT * FROM production_boards')).toEqual([]);
    expect(await source.query('SELECT * FROM production_stages')).toEqual([]);
    expect(await source.query('SELECT status FROM order_groups')).toEqual([
      { status: 'in_production' },
    ]);
    expect(
      await source.query('SELECT "orderGroupId", "totalPrice" FROM orders'),
    ).toEqual([{ orderGroupId: 1, totalPrice: 123.45 }]);
    expect(await source.runMigrations()).toEqual([]);
  });

  it('enforces stage progress and both foreign keys', async () => {
    await source.query(
      `INSERT INTO production_boards (id, name) VALUES ('board', 'Test')`,
    );
    for (const [kind, progress] of [
      ['queue', 1],
      ['active', 100],
      ['done', 0],
      ['other', 50],
    ]) {
      await expect(
        source.query(
          `INSERT INTO production_stages (id, "boardId", name, color, kind, "progressPercent") VALUES ('invalid', 'board', 'Invalid', '#ffffff', ?, ?)`,
          [kind, progress],
        ),
      ).rejects.toThrow();
    }
    await expect(
      source.query(
        `INSERT INTO production_stages (id, "boardId", name, color, kind, "progressPercent") VALUES ('missing', 'unknown', 'Missing', '#ffffff', 'queue', 0)`,
      ),
    ).rejects.toThrow();
    await expect(
      source.query(`UPDATE production_boards SET "initialStageId" = 'missing'`),
    ).rejects.toThrow();
    await source.query(
      `INSERT INTO production_stages (id, "boardId", name, color, kind, "progressPercent") VALUES ('queue', 'board', 'Queue', '#ffffff', 'queue', 0)`,
    );
    await source.query(
      `UPDATE production_boards SET "initialStageId" = 'queue'`,
    );
    await expect(
      source.query(`DELETE FROM production_stages WHERE id = 'queue'`),
    ).rejects.toThrow();
    expect(await source.query('PRAGMA foreign_key_check')).toEqual([]);
  });

  it('reverts a populated board schema only on the disposable database and reapplies it', async () => {
    await source.undoLastMigration();
    expect(await source.query('SELECT "totalPrice" FROM orders')).toEqual([
      { totalPrice: 123.45 },
    ]);
    await source.runMigrations();
    expect(await source.query('SELECT * FROM production_boards')).toEqual([]);
    expect(await source.query('PRAGMA foreign_key_check')).toEqual([]);
  });
});
