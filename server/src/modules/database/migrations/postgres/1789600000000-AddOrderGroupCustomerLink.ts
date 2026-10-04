import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderGroupCustomerLink1789600000000
  implements MigrationInterface
{
  name = 'AddOrderGroupCustomerLink1789600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_groups" ADD "customerId" uuid`);
    await queryRunner.query(
      `UPDATE "order_groups" AS order_group
       SET "customerId" = customer.id
       FROM "customers" AS customer
       WHERE order_group.customer ->> 'id' = customer.id::text`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_order_groups_customer" ON "order_groups" ("customerId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_groups" ADD CONSTRAINT "FK_order_groups_customer" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order_groups" DROP CONSTRAINT "FK_order_groups_customer"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_order_groups_customer"`);
    await queryRunner.query(
      `ALTER TABLE "order_groups" DROP COLUMN "customerId"`,
    );
  }
}
