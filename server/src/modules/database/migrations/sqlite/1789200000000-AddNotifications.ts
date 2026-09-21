import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotifications1789200000000 implements MigrationInterface {
  name = 'AddNotifications1789200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" varchar PRIMARY KEY NOT NULL, "dedupKey" text NOT NULL, "ruleId" varchar, "ruleRevision" integer NOT NULL, "orderGroupId" integer, "orderId" varchar, "trigger" text NOT NULL, "severity" text NOT NULL, "message" text NOT NULL DEFAULT ('[]'), "targetSnapshot" text NOT NULL DEFAULT ('{}'), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "readAt" datetime, "resolvedAt" datetime, CONSTRAINT "FK_notifications_rule" FOREIGN KEY ("ruleId") REFERENCES "notification_rules" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_notifications_group" FOREIGN KEY ("orderGroupId") REFERENCES "order_groups" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_notifications_order" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE SET NULL ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_notifications_dedup_key" ON "notifications" ("dedupKey")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_feed" ON "notifications" ("readAt", "createdAt", "id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications"`);
  }
}
