import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddOrderDocumentNumber1787600000000 implements MigrationInterface {
  name = 'AddOrderDocumentNumber1787600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'documentNumber',
        type: 'integer',
        isNullable: true,
      }),
    );
    await queryRunner.query(`
      WITH numbered AS (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY "orderGroupId"
          ORDER BY "createdAt", id
        ) AS number
        FROM orders
      )
      UPDATE orders
      SET "documentNumber" = (
        SELECT number FROM numbered WHERE numbered.id = orders.id
      )
    `);
    await queryRunner.changeColumn(
      'orders',
      'documentNumber',
      new TableColumn({
        name: 'documentNumber',
        type: 'integer',
        isNullable: false,
      }),
    );
    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_orders_orderGroup_documentNumber',
        columnNames: ['orderGroupId', 'documentNumber'],
        isUnique: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'orders',
      'IDX_orders_orderGroup_documentNumber',
    );
    await queryRunner.dropColumn('orders', 'documentNumber');
  }
}
