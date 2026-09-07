import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class AddOrderManagement1788800000000 implements MigrationInterface {
  name = 'AddOrderManagement1788800000000';
  // SQLite must disable FK actions before opening the rebuild transaction.
  transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('PRAGMA foreign_keys = OFF');
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(
        `CREATE TABLE "custom_order_statuses" ("id" varchar PRIMARY KEY NOT NULL, "scope" text NOT NULL, "name" text NOT NULL, "color" text NOT NULL, "position" integer NOT NULL DEFAULT 0, "archivedAt" datetime, CONSTRAINT "CHK_custom_order_statuses_scope" CHECK ("scope" IN ('group', 'document')))`,
      );
      await queryRunner.query(
        `CREATE TABLE "order_management_settings" ("id" integer PRIMARY KEY NOT NULL, "timeZone" text NOT NULL DEFAULT 'Europe/Moscow', CONSTRAINT "CHK_order_management_settings_singleton" CHECK ("id" = 1))`,
      );
      await queryRunner.query(
        `INSERT INTO "order_management_settings" ("id", "timeZone") VALUES (1, 'Europe/Moscow')`,
      );
      await queryRunner.query(`ALTER TABLE "order_groups" ADD "dueDate" date`);
      await queryRunner.query(
        `ALTER TABLE "order_groups" ADD "managementVersion" integer NOT NULL DEFAULT 0`,
      );
      await queryRunner.query(
        `ALTER TABLE "order_groups" ADD "customStatusId" varchar`,
      );
      await queryRunner.createForeignKey(
        'order_groups',
        new TableForeignKey({
          name: 'FK_order_groups_custom_status',
          columnNames: ['customStatusId'],
          referencedTableName: 'custom_order_statuses',
          referencedColumnNames: ['id'],
          onDelete: 'RESTRICT',
          onUpdate: 'NO ACTION',
        }),
      );
      await queryRunner.query(`ALTER TABLE "orders" ADD "dueDate" date`);
      await queryRunner.query(
        `ALTER TABLE "orders" ADD "managementVersion" integer NOT NULL DEFAULT 0`,
      );
      await queryRunner.query(
        `ALTER TABLE "orders" ADD "customStatusId" varchar`,
      );
      await queryRunner.createForeignKey(
        'orders',
        new TableForeignKey({
          name: 'FK_orders_custom_status',
          columnNames: ['customStatusId'],
          referencedTableName: 'custom_order_statuses',
          referencedColumnNames: ['id'],
          onDelete: 'RESTRICT',
          onUpdate: 'NO ACTION',
        }),
      );
      await queryRunner.query(
        `CREATE TABLE "order_management_events" ("id" varchar PRIMARY KEY NOT NULL, "orderGroupId" integer, "orderId" varchar, "type" text NOT NULL, "before" text NOT NULL, "after" text NOT NULL, "targetSnapshot" text NOT NULL, "reason" text, "occurredAt" datetime NOT NULL DEFAULT (datetime('now')), "notificationProcessedAt" datetime, CONSTRAINT "FK_management_events_group" FOREIGN KEY ("orderGroupId") REFERENCES "order_groups" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_management_events_order" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE SET NULL ON UPDATE NO ACTION)`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_custom_order_statuses_scope_position" ON "custom_order_statuses" ("scope", "position")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_order_groups_custom_status" ON "order_groups" ("customStatusId")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_orders_custom_status" ON "orders" ("customStatusId")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_order_groups_status_due_date" ON "order_groups" ("status", "dueDate")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_orders_due_date" ON "orders" ("dueDate")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_management_events_pending" ON "order_management_events" ("notificationProcessedAt", "occurredAt", "id")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_management_events_group" ON "order_management_events" ("orderGroupId", "occurredAt", "id")`,
      );
      await queryRunner.query(
        `CREATE INDEX "IDX_management_events_order" ON "order_management_events" ("orderId", "occurredAt", "id")`,
      );
      const violations = (await queryRunner.query(
        'PRAGMA foreign_key_check',
      )) as unknown[];
      if (violations.length)
        throw new Error('Order management migration violated foreign keys.');
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.query('PRAGMA foreign_keys = ON');
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('PRAGMA foreign_keys = OFF');
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(`DROP INDEX "IDX_management_events_order"`);
      await queryRunner.query(`DROP INDEX "IDX_management_events_group"`);
      await queryRunner.query(`DROP INDEX "IDX_management_events_pending"`);
      await queryRunner.query(`DROP INDEX "IDX_orders_due_date"`);
      await queryRunner.query(`DROP INDEX "IDX_order_groups_status_due_date"`);
      await queryRunner.query(`DROP INDEX "IDX_orders_custom_status"`);
      await queryRunner.query(`DROP INDEX "IDX_order_groups_custom_status"`);
      await queryRunner.query(
        `DROP INDEX "IDX_custom_order_statuses_scope_position"`,
      );
      await queryRunner.query(`DROP TABLE "order_management_events"`);
      await queryRunner.dropForeignKey('orders', 'FK_orders_custom_status');
      await queryRunner.dropColumn('orders', 'customStatusId');
      await queryRunner.query(
        `ALTER TABLE "orders" DROP COLUMN "managementVersion"`,
      );
      await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "dueDate"`);
      await queryRunner.dropForeignKey(
        'order_groups',
        'FK_order_groups_custom_status',
      );
      await queryRunner.dropColumn('order_groups', 'customStatusId');
      await queryRunner.query(
        `ALTER TABLE "order_groups" DROP COLUMN "managementVersion"`,
      );
      await queryRunner.query(
        `ALTER TABLE "order_groups" DROP COLUMN "dueDate"`,
      );
      await queryRunner.query(`DROP TABLE "order_management_settings"`);
      await queryRunner.query(`DROP TABLE "custom_order_statuses"`);
      const violations = (await queryRunner.query(
        'PRAGMA foreign_key_check',
      )) as unknown[];
      if (violations.length)
        throw new Error('Order management migration violated foreign keys.');
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.query('PRAGMA foreign_keys = ON');
    }
  }
}
