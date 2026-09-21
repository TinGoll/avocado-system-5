import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductionAutoAssignment1789400000000
  implements MigrationInterface
{
  name = 'AddProductionAutoAssignment1789400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_management_settings" ADD "autoAddStatus" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_management_settings" ADD "autoAddBoardId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_management_settings" ADD "autoAddStageId" uuid`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_management_settings" DROP COLUMN "autoAddStageId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_management_settings" DROP COLUMN "autoAddBoardId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_management_settings" DROP COLUMN "autoAddStatus"`,
    );
  }
}
