import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAutomaticDueDateRules1789500000000
  implements MigrationInterface
{
  name = 'AddAutomaticDueDateRules1789500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_management_settings" ADD "dueDateRules" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_management_settings" DROP COLUMN "dueDateRules"`,
    );
  }
}
