/* eslint-disable @typescript-eslint/no-require-imports */
import { DataSource } from 'typeorm';
import type { OrderManagementEventService } from '../order-management/order-management-event.service';
import type { OrderManagementEvent } from '../order-management/entities/order-management-event.entity';

describe('Order management migration and transactional journal (SQLite)', () => {
  let source: DataSource;
  let journal: OrderManagementEventService;
  let eventEntity: typeof OrderManagementEvent;
  const oldKind = process.env.DB_TYPE;
  const targetSnapshot = {
    orderNumber: 'OLD-1',
    documentNumber: 1,
    documentName: 'Фасады',
  };

  beforeAll(async () => {
    process.env.DB_TYPE = 'sqlite';
    eventEntity = (
      require('../order-management/entities/order-management-event.entity') as typeof import('../order-management/entities/order-management-event.entity')
    ).OrderManagementEvent;
    const { OrderManagementEventService: Journal } =
      require('../order-management/order-management-event.service') as typeof import('../order-management/order-management-event.service');
    journal = new Journal();
    source = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      synchronize: false,
      entities: [__dirname + '/../**/*.entity.ts'],
      migrations: [__dirname + '/migrations/sqlite/*.ts'],
      migrationsTransactionMode: 'each',
    });
    await source.initialize();
    const allMigrations = source.migrations;
    source.migrations = allMigrations.filter(
      (migration) => migration.name !== 'AddOrderManagement1788800000000',
    );
    await source.runMigrations();
    await source.query(
      `INSERT INTO order_groups (id, "orderNumber", status) VALUES (1, 'OLD-1', 'in_production')`,
    );
    await source.query(
      `INSERT INTO orders (id, "documentNumber", "orderGroupId", name, "totalPrice") VALUES ('old-document', 1, 1, 'Фасады', 123.45)`,
    );
    await source.query(
      `INSERT INTO order_items (id, quantity, snapshot, "orderId", "calculatedCustomerPrice") VALUES ('old-item', 2, '{}', 'old-document', 61.725)`,
    );
    source.migrations = allMigrations;
    await source.runMigrations();
  });

  afterAll(async () => {
    if (source?.isInitialized) await source.destroy();
    if (oldKind === undefined) delete process.env.DB_TYPE;
    else process.env.DB_TYPE = oldKind;
  });

  it('preserves old status, prices, items and relations without invented management data', async () => {
    expect(
      await source.query(
        'SELECT status, "dueDate", "customStatusId", "managementVersion" FROM order_groups',
      ),
    ).toEqual([
      {
        status: 'in_production',
        dueDate: null,
        customStatusId: null,
        managementVersion: 0,
      },
    ]);
    expect(
      await source.query(
        'SELECT "totalPrice", "orderGroupId", "dueDate", "customStatusId", "managementVersion" FROM orders',
      ),
    ).toEqual([
      {
        totalPrice: 123.45,
        orderGroupId: 1,
        dueDate: null,
        customStatusId: null,
        managementVersion: 0,
      },
    ]);
    expect(
      await source.query(
        'SELECT "orderId", "calculatedCustomerPrice" FROM order_items',
      ),
    ).toEqual([{ orderId: 'old-document', calculatedCustomerPrice: 61.725 }]);
    expect(await source.query('SELECT * FROM order_management_events')).toEqual(
      [],
    );
    expect(await source.query('SELECT * FROM custom_order_statuses')).toEqual(
      [],
    );
    expect(
      await source.query('SELECT * FROM order_management_settings'),
    ).toEqual([{ id: 1, timeZone: 'Europe/Moscow' }]);
    expect(await source.runMigrations()).toEqual([]);
    expect((await source.driver.createSchemaBuilder().log()).upQueries).toEqual(
      [],
    );
  });

  it('enforces singleton settings, status scope and status foreign keys', async () => {
    await expect(
      source.query('INSERT INTO order_management_settings (id) VALUES (2)'),
    ).rejects.toThrow();
    await expect(
      source.query(
        `INSERT INTO custom_order_statuses (id, scope, name, color) VALUES ('bad', 'other', 'Bad', '#ffffff')`,
      ),
    ).rejects.toThrow();
    await expect(
      source.query(`UPDATE orders SET "customStatusId" = 'missing'`),
    ).rejects.toThrow();
    await expect(
      source.query(`UPDATE order_groups SET "customStatusId" = 'missing'`),
    ).rejects.toThrow();
    await source.query(
      `INSERT INTO custom_order_statuses (id, scope, name, color) VALUES ('status', 'document', 'Ожидание', '#ffffff')`,
    );
    await source.query(
      `UPDATE orders SET "customStatusId" = 'status', "dueDate" = '2026-09-10'`,
    );
    await expect(
      source.query(`DELETE FROM custom_order_statuses WHERE id = 'status'`),
    ).rejects.toThrow();
    expect(await source.query('SELECT "dueDate" FROM orders')).toEqual([
      { dueDate: '2026-09-10' },
    ]);
  });

  it('rejects a nontransactional manager and rolls events back with the business update', async () => {
    const event = {
      orderGroupId: 1,
      orderId: 'old-document',
      type: 'due_date_changed' as const,
      before: { dueDate: null },
      after: { dueDate: '2026-09-11' },
      targetSnapshot,
    };
    await expect(journal.record(source.manager, event)).rejects.toThrow(
      'active transaction',
    );
    await expect(
      source.transaction(async (manager) => {
        await manager.query(
          `UPDATE order_groups SET "dueDate" = '2026-09-11', "managementVersion" = 1 WHERE id = 1`,
        );
        await journal.record(manager, event);
        expect(await manager.count(eventEntity)).toBe(1);
        throw new Error('abort');
      }),
    ).rejects.toThrow('abort');
    expect(await source.manager.count(eventEntity)).toBe(0);
    expect(
      await source.query(
        'SELECT "dueDate", "managementVersion" FROM order_groups',
      ),
    ).toEqual([{ dueDate: null, managementVersion: 0 }]);
  });

  it('retains JSON snapshots when deleted object references are nulled', async () => {
    const event = await source.transaction((manager) =>
      journal.record(manager, {
        orderGroupId: 1,
        orderId: 'old-document',
        type: 'document_deleted',
        before: { stage: { id: 'stage-id', name: 'Покраска' } },
        after: {},
        targetSnapshot,
        reason: 'Удалён документ',
      }),
    );
    await source.transaction(async (manager) => {
      await manager.query(`DELETE FROM orders WHERE id = 'old-document'`);
      await manager.query('DELETE FROM order_groups WHERE id = 1');
    });
    const saved = await source.manager.findOneByOrFail(eventEntity, {
      id: event.id,
    });
    expect(saved).toMatchObject({
      orderId: null,
      orderGroupId: null,
      targetSnapshot,
      before: { stage: { id: 'stage-id', name: 'Покраска' } },
      after: {},
      notificationProcessedAt: null,
      reason: 'Удалён документ',
    });
    expect(saved.occurredAt).toBeInstanceOf(Date);
    expect(await source.query('PRAGMA foreign_key_check')).toEqual([]);
  });

  it('can revert and reapply on the disposable database', async () => {
    await source.undoLastMigration();
    expect(await source.query('PRAGMA foreign_keys')).toEqual([
      { foreign_keys: 1 },
    ]);
    await source.runMigrations();
    expect((await source.driver.createSchemaBuilder().log()).upQueries).toEqual(
      [],
    );
  });
});
