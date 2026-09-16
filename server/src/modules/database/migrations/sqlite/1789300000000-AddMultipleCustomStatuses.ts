import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMultipleCustomStatuses1789300000000
  implements MigrationInterface
{
  name = 'AddMultipleCustomStatuses1789300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "order_group_custom_statuses" ("orderGroupId" integer NOT NULL, "customStatusId" varchar NOT NULL, CONSTRAINT "FK_d28d3a0f61115ad46d82f44fb41" FOREIGN KEY ("orderGroupId") REFERENCES "order_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_058a2b26e034c50c47e443728e9" FOREIGN KEY ("customStatusId") REFERENCES "custom_order_statuses"("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("orderGroupId", "customStatusId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d28d3a0f61115ad46d82f44fb4" ON "order_group_custom_statuses" ("orderGroupId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_058a2b26e034c50c47e443728e" ON "order_group_custom_statuses" ("customStatusId")`,
    );
    await queryRunner.query(
      `INSERT INTO "order_group_custom_statuses" ("orderGroupId", "customStatusId") SELECT "id", "customStatusId" FROM "order_groups" WHERE "customStatusId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_custom_statuses" ("orderId" varchar NOT NULL, "customStatusId" varchar NOT NULL, CONSTRAINT "FK_610be495408de5ca69aded446ef" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_a1eeff49860687f374aeea5b38b" FOREIGN KEY ("customStatusId") REFERENCES "custom_order_statuses"("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("orderId", "customStatusId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_610be495408de5ca69aded446e" ON "order_custom_statuses" ("orderId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a1eeff49860687f374aeea5b38" ON "order_custom_statuses" ("customStatusId")`,
    );
    await queryRunner.query(
      `INSERT INTO "order_custom_statuses" ("orderId", "customStatusId") SELECT "id", "customStatusId" FROM "orders" WHERE "customStatusId" IS NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "order_custom_statuses"`);
    await queryRunner.query(`DROP TABLE "order_group_custom_statuses"`);
  }
}
