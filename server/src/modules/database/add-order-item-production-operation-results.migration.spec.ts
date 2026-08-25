import { DataSource } from 'typeorm';
import { AddOrderItemProductionOperationResults1787300000000 } from './migrations/sqlite/1787300000000-AddOrderItemProductionOperationResults';

describe('AddOrderItemProductionOperationResults1787300000000', () => {
  let dataSource: DataSource;

  beforeEach(async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
    });
    await dataSource.initialize();
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it('adds an empty result snapshot without recalculating old items', async () => {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.query(
      `CREATE TABLE "order_items" ("id" varchar PRIMARY KEY NOT NULL)`,
    );
    await queryRunner.query(`INSERT INTO "order_items" ("id") VALUES ('old')`);

    const migration = new AddOrderItemProductionOperationResults1787300000000();
    await migration.up(queryRunner);

    await expect(
      queryRunner.query(
        `SELECT "productionOperationResults" FROM "order_items" WHERE "id" = 'old'`,
      ),
    ).resolves.toEqual([{ productionOperationResults: '[]' }]);

    await queryRunner.release();
  });
});
