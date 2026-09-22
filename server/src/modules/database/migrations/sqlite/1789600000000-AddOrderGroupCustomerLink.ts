import {
  TableColumn,
  TableForeignKey,
  TableIndex,
  type MigrationInterface,
  type QueryRunner,
} from 'typeorm';

export class AddOrderGroupCustomerLink1789600000000
  implements MigrationInterface
{
  name = 'AddOrderGroupCustomerLink1789600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'order_groups',
      new TableColumn({
        name: 'customerId',
        type: 'varchar',
        isNullable: true,
      }),
    );
    await queryRunner.query(
      `UPDATE "order_groups"
       SET "customerId" = json_extract(customer, '$.id')
       WHERE json_valid(customer) = 1
         AND typeof(json_extract(customer, '$.id')) = 'text'
         AND EXISTS (
           SELECT 1 FROM "customers"
           WHERE customers.id = json_extract(order_groups.customer, '$.id')
         )`,
    );
    await queryRunner.createIndex(
      'order_groups',
      new TableIndex({
        name: 'IDX_order_groups_customer',
        columnNames: ['customerId'],
      }),
    );
    await queryRunner.createForeignKey(
      'order_groups',
      new TableForeignKey({
        name: 'FK_order_groups_customer',
        columnNames: ['customerId'],
        referencedTableName: 'customers',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey(
      'order_groups',
      'FK_order_groups_customer',
    );
    await queryRunner.dropIndex('order_groups', 'IDX_order_groups_customer');
    await queryRunner.dropColumn('order_groups', 'customerId');
  }
}
