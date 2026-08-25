import { DataSource } from 'typeorm';
import { AddProductionOperationFormula1787200000000 } from './migrations/sqlite/1787200000000-AddProductionOperationFormula';

describe('AddProductionOperationFormula1787200000000', () => {
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

  it('backfills formulas and templates without losing operation links', async () => {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.query(`
      CREATE TABLE "production_operations" (
        "id" varchar PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "calculationMethod" varchar NOT NULL,
        "costPerUnit" decimal(10,2) NOT NULL,
        "createdAt" datetime NOT NULL,
        "updatedAt" datetime NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "product_templates_operations_production_operations" (
        "productTemplatesId" varchar NOT NULL,
        "productionOperationsId" varchar NOT NULL,
        CONSTRAINT "FK_operation" FOREIGN KEY ("productionOperationsId")
          REFERENCES "production_operations" ("id") ON DELETE CASCADE,
        PRIMARY KEY ("productTemplatesId", "productionOperationsId")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "production_operations"
        ("id", "name", "calculationMethod", "costPerUnit", "createdAt", "updatedAt")
      VALUES
        ('per-item', 'Сборка', 'per_item', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('area', 'Шлифовка', 'area', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('volume', 'Сушка', 'volume', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    await queryRunner.query(`
      INSERT INTO "product_templates_operations_production_operations"
        ("productTemplatesId", "productionOperationsId")
      VALUES ('template', 'area')
    `);

    const migration = new AddProductionOperationFormula1787200000000();
    await migration.up(queryRunner);

    const operations = (await queryRunner.query(`
      SELECT "id", "name", "calculationFormula", "displayNameTemplate"
      FROM "production_operations"
      ORDER BY "id"
    `)) as Array<Record<string, string>>;
    expect(operations).toEqual([
      {
        id: 'area',
        name: 'Шлифовка',
        calculationFormula:
          'item.width / 1000 * item.height / 1000 * item.quantity',
        displayNameTemplate: 'Шлифовка',
      },
      {
        id: 'per-item',
        name: 'Сборка',
        calculationFormula: 'item.quantity',
        displayNameTemplate: 'Сборка',
      },
      {
        id: 'volume',
        name: 'Сушка',
        calculationFormula:
          'item.width / 1000 * item.height / 1000 * item.thickness / 1000 * item.quantity',
        displayNameTemplate: 'Сушка',
      },
    ]);

    const table = await queryRunner.getTable('production_operations');
    expect(table?.findColumnByName('calculationFormula')?.isNullable).toBe(
      false,
    );
    expect(table?.findColumnByName('displayNameTemplate')?.isNullable).toBe(
      false,
    );
    await expect(
      queryRunner.query(
        `SELECT * FROM "product_templates_operations_production_operations"`,
      ),
    ).resolves.toEqual([
      { productTemplatesId: 'template', productionOperationsId: 'area' },
    ]);

    await queryRunner.release();
  });
});
