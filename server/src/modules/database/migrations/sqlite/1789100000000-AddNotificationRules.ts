import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationRules1789100000000 implements MigrationInterface {
  name = 'AddNotificationRules1789100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "notification_rules" ("id" varchar PRIMARY KEY NOT NULL, "name" text NOT NULL, "enabled" boolean NOT NULL DEFAULT (0), "revision" integer NOT NULL DEFAULT (1), "scope" text NOT NULL, "trigger" text NOT NULL, "conditions" text NOT NULL DEFAULT ('{}'), "repeat" text NOT NULL, "messageTemplate" text NOT NULL, "severity" text NOT NULL, "activatedAt" datetime NOT NULL, CONSTRAINT "CHK_notification_rules_scope" CHECK ("scope" IN ('group', 'document')), CONSTRAINT "CHK_notification_rules_trigger" CHECK ("trigger" IN ('due_soon', 'overdue', 'stage_stalled', 'stage_changed', 'custom_status_changed', 'lifecycle_changed')), CONSTRAINT "CHK_notification_rules_repeat" CHECK ("repeat" IN ('once', 'daily')), CONSTRAINT "CHK_notification_rules_severity" CHECK ("severity" IN ('info', 'warning', 'error')), CONSTRAINT "CHK_notification_rules_revision" CHECK ("revision" >= 1))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notification_rules"`);
  }
}
