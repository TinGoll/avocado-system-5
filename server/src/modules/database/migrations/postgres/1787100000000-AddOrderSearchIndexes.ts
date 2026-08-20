import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderSearchIndexes1787100000000 implements MigrationInterface {
  name = 'AddOrderSearchIndexes1787100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    await queryRunner.query(
      `CREATE INDEX "IDX_order_groups_search" ON "order_groups" USING gin (lower(coalesce("orderNumber", '') || ' ' || coalesce(customer::text, '') || ' ' || coalesce(comment, '')) gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_search" ON "orders" USING gin (lower(coalesce(name, '') || ' ' || coalesce(comment, '') || ' ' || coalesce(characteristics::text, '') || ' ' || coalesce("totalPrice"::text, '')) gin_trgm_ops)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_items_search" ON "order_items" USING gin (lower(coalesce(snapshot::text, '') || ' ' || coalesce(characteristics::text, '') || ' ' || coalesce(quantity::text, '')) gin_trgm_ops)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_order_items_search"`);
    await queryRunner.query(`DROP INDEX "IDX_orders_search"`);
    await queryRunner.query(`DROP INDEX "IDX_order_groups_search"`);
  }
}
