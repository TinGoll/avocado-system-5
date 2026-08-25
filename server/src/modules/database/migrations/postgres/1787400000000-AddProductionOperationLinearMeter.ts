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
  }
}
