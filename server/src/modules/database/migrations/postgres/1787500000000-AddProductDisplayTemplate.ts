import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProductDisplayTemplate1787500000000
  implements MigrationInterface
{
  name = 'AddProductDisplayTemplate1787500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'product_templates',
      new TableColumn({
        name: 'displayTemplate',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('product_templates', 'displayTemplate');
  }
}
