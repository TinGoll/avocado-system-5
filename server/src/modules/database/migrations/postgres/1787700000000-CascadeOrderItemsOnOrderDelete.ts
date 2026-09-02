import { MigrationInterface, QueryRunner, TableForeignKey } from 'typeorm';

export class CascadeOrderItemsOnOrderDelete1787700000000
  implements MigrationInterface
{
  name = 'CascadeOrderItemsOnOrderDelete1787700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.changeOnDelete(queryRunner, 'CASCADE');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await this.changeOnDelete(queryRunner, 'NO ACTION');
  }

  private async changeOnDelete(
    queryRunner: QueryRunner,
    onDelete: 'CASCADE' | 'NO ACTION',
  ): Promise<void> {
    const table = await queryRunner.getTable('order_items');
    const foreignKey = table?.foreignKeys.find(
      ({ columnNames, referencedTableName }) =>
        referencedTableName === 'orders' && columnNames.includes('orderId'),
    );

    if (!foreignKey) {
      throw new Error(
        'Foreign key from order_items.orderId to orders not found',
      );
    }

    await queryRunner.dropForeignKey('order_items', foreignKey);
    await queryRunner.createForeignKey(
      'order_items',
      new TableForeignKey({
        name: foreignKey.name,
        columnNames: foreignKey.columnNames,
        referencedTableName: foreignKey.referencedTableName,
        referencedColumnNames: foreignKey.referencedColumnNames,
        onDelete,
        onUpdate: foreignKey.onUpdate,
      }),
    );
  }
}
