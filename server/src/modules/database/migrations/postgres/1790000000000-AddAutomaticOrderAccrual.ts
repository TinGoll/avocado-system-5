import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAutomaticOrderAccrual1790000000000
  implements MigrationInterface
{
  name = 'AddAutomaticOrderAccrual1790000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_management_settings" ADD "autoAccrualStatus" text`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_management_settings" DROP COLUMN "autoAccrualStatus"`,
    );
  }
}
