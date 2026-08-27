import { DataSource } from 'typeorm';
import { AddProductDisplayTemplate1787500000000 } from './migrations/sqlite/1787500000000-AddProductDisplayTemplate';

describe('AddProductDisplayTemplate1787500000000', () => {
  it('adds a nullable display template without backfill', async () => {
    const dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
    });
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.query(
      'CREATE TABLE "product_templates" ("id" varchar PRIMARY KEY, "name" text NOT NULL)',
    );
    await queryRunner.query(
      'INSERT INTO "product_templates" ("id", "name") VALUES (\'1\', \'Фасад\')',
    );

    await new AddProductDisplayTemplate1787500000000().up(queryRunner);

    expect(
      (await queryRunner.getTable('product_templates'))?.findColumnByName(
        'displayTemplate',
      ),
    ).toMatchObject({
      isNullable: true,
      length: '500',
    });
    await expect(
      queryRunner.query('SELECT "displayTemplate" FROM "product_templates"'),
    ).resolves.toEqual([{ displayTemplate: null }]);
    await queryRunner.release();
    await dataSource.destroy();
  });
});
