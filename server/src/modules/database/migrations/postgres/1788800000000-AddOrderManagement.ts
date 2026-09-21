import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderManagement1788800000000 implements MigrationInterface {
  name = 'AddOrderManagement1788800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "custom_order_statuses" ("id" uuid PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(), "scope" text NOT NULL, "name" text NOT NULL, "color" text NOT NULL, "position" integer NOT NULL DEFAULT 0, "archivedAt" timestamptz, CONSTRAINT "CHK_custom_order_statuses_scope" CHECK ("scope" IN ('group', 'document')))`,
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
      `ALTER TABLE "order_groups" ADD "customStatusId" uuid CONSTRAINT "FK_order_groups_custom_status" REFERENCES "custom_order_statuses" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "orders" ADD "dueDate" date`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "managementVersion" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "customStatusId" uuid CONSTRAINT "FK_orders_custom_status" REFERENCES "custom_order_statuses" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_management_events" ("id" uuid PRIMARY KEY NOT NULL DEFAULT uuid_generate_v4(), "orderGroupId" integer, "orderId" uuid, "type" text NOT NULL, "before" jsonb NOT NULL, "after" jsonb NOT NULL, "targetSnapshot" jsonb NOT NULL, "reason" text, "occurredAt" timestamptz NOT NULL DEFAULT (now()), "notificationProcessedAt" timestamptz, CONSTRAINT "FK_management_events_group" FOREIGN KEY ("orderGroupId") REFERENCES "order_groups" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_management_events_order" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE SET NULL ON UPDATE NO ACTION)`,
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
  }

  async down(queryRunner: QueryRunner): Promise<void> {
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
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "customStatusId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "managementVersion"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "dueDate"`);
    await queryRunner.query(
      `ALTER TABLE "order_groups" DROP COLUMN "customStatusId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_groups" DROP COLUMN "managementVersion"`,
    );
    await queryRunner.query(`ALTER TABLE "order_groups" DROP COLUMN "dueDate"`);
    await queryRunner.query(`DROP TABLE "order_management_settings"`);
    await queryRunner.query(`DROP TABLE "custom_order_statuses"`);
  }
}
