import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const calculationMethods = ['per_item', 'linear_meter', 'area', 'volume'];

export class AddProductionOperationLinearMeter1787400000000
  implements MigrationInterface
{
  name = 'AddProductionOperationLinearMeter1787400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.changeCalculationMethods(queryRunner, calculationMethods);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await this.changeCalculationMethods(queryRunner, [
      'per_item',
      'area',
      'volume',
    ]);
  }

  private async changeCalculationMethods(
    queryRunner: QueryRunner,
    enumValues: string[],
  ): Promise<void> {
    await queryRunner.query(`
      CREATE TEMPORARY TABLE "production_operation_links_backup" AS
      SELECT "productTemplatesId", "productionOperationsId"
      FROM "product_templates_operations_production_operations"
    `);

    const table = await queryRunner.getTable('production_operations');
    const column = table?.findColumnByName('calculationMethod');
    if (!column) {
      throw new Error('Production operation calculation method was not found.');
    }

    await queryRunner.changeColumn(
      table!,
      column,
      new TableColumn({
        ...column,
        type: 'varchar',
        enum: enumValues,
        default: "'per_item'",
      }),
    );

    await queryRunner.query(`
      INSERT OR IGNORE INTO "product_templates_operations_production_operations"
        ("productTemplatesId", "productionOperationsId")
      SELECT "productTemplatesId", "productionOperationsId"
      FROM "production_operation_links_backup"
    `);
    await queryRunner.query(`DROP TABLE "production_operation_links_backup"`);
  }
}
