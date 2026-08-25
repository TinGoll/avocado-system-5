import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderItemProductionOperationResults1787300000000
  implements MigrationInterface
{
  name = 'AddOrderItemProductionOperationResults1787300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "productionOperationResults" jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN "productionOperationResults"`,
    );
  }
}
