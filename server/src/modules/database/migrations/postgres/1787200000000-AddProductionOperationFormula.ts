import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductionOperationFormula1787200000000
  implements MigrationInterface
{
  name = 'AddProductionOperationFormula1787200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "production_operations" ADD "calculationFormula" character varying(1000)`,
    );
    await queryRunner.query(
      `ALTER TABLE "production_operations" ADD "displayNameTemplate" character varying(500)`,
    );
    await queryRunner.query(`
      UPDATE "production_operations"
      SET
        "calculationFormula" = CASE "calculationMethod"
          WHEN 'area' THEN 'item.width / 1000 * item.height / 1000 * item.quantity'
          WHEN 'volume' THEN 'item.width / 1000 * item.height / 1000 * item.thickness / 1000 * item.quantity'
          ELSE 'item.quantity'
        END,
        "displayNameTemplate" = "name"
    `);
    await queryRunner.query(
      `ALTER TABLE "production_operations" ALTER COLUMN "calculationFormula" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "production_operations" ALTER COLUMN "displayNameTemplate" SET NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "production_operations" DROP COLUMN "displayNameTemplate"`,
    );
    await queryRunner.query(
      `ALTER TABLE "production_operations" DROP COLUMN "calculationFormula"`,
    );
  }
}
