import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProductionOperationFormula1787200000000
  implements MigrationInterface
{
  name = 'AddProductionOperationFormula1787200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.backUpOperationLinks(queryRunner);

    await queryRunner.addColumns('production_operations', [
      new TableColumn({
        name: 'calculationFormula',
        type: 'varchar',
        length: '1000',
        isNullable: true,
      }),
      new TableColumn({
        name: 'displayNameTemplate',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    ]);

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

    const table = await queryRunner.getTable('production_operations');
    const calculationFormulaColumn =
      table?.findColumnByName('calculationFormula');
    const displayNameTemplateColumn = table?.findColumnByName(
      'displayNameTemplate',
    );

    if (!calculationFormulaColumn || !displayNameTemplateColumn) {
      throw new Error('Production operation formula columns were not created.');
    }

    await queryRunner.changeColumns('production_operations', [
      {
        oldColumn: calculationFormulaColumn,
        newColumn: new TableColumn({
          ...calculationFormulaColumn,
          isNullable: false,
        }),
      },
      {
        oldColumn: displayNameTemplateColumn,
        newColumn: new TableColumn({
          ...displayNameTemplateColumn,
          isNullable: false,
        }),
      },
    ]);

    await this.restoreOperationLinks(queryRunner);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await this.backUpOperationLinks(queryRunner);
    await queryRunner.dropColumns('production_operations', [
      'displayNameTemplate',
      'calculationFormula',
    ]);
    await this.restoreOperationLinks(queryRunner);
  }

  private async backUpOperationLinks(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TEMPORARY TABLE "production_operation_links_backup" AS
      SELECT "productTemplatesId", "productionOperationsId"
      FROM "product_templates_operations_production_operations"
    `);
  }

  private async restoreOperationLinks(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT OR IGNORE INTO "product_templates_operations_production_operations"
        ("productTemplatesId", "productionOperationsId")
      SELECT "productTemplatesId", "productionOperationsId"
      FROM "production_operation_links_backup"
    `);
    await queryRunner.query(`DROP TABLE "production_operation_links_backup"`);
  }
}
