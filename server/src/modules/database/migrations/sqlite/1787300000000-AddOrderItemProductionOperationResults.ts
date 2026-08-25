import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddOrderItemProductionOperationResults1787300000000
  implements MigrationInterface
{
  name = 'AddOrderItemProductionOperationResults1787300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'order_items',
      new TableColumn({
        name: 'productionOperationResults',
        type: 'text',
        isNullable: false,
        default: "'[]'",
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('order_items', 'productionOperationResults');
  }
}
