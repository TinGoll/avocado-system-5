import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFinancialAllocationBatches1789900000000
  implements MigrationInterface
{
  name = 'AddFinancialAllocationBatches1789900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "financial_allocation_batches" (
        "id" SERIAL NOT NULL,
        "customerId" uuid NOT NULL,
        "requestId" uuid NOT NULL,
        "comment" text,
        "authorName" text,
        "totalMinor" bigint NOT NULL,
        "balanceAfterMinor" bigint NOT NULL,
        "requestSnapshot" jsonb NOT NULL,
        "resultSnapshot" jsonb NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_financial_allocation_batches" PRIMARY KEY ("id"),
        CONSTRAINT "FK_financial_allocation_batches_customer" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_financial_allocation_batches_request" ON "financial_allocation_batches" ("requestId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_financial_allocation_batches_customer_created" ON "financial_allocation_batches" ("customerId", "createdAt", "id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "financial_payment_allocations" ADD "batchId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "financial_payment_allocations" ADD CONSTRAINT "FK_financial_payment_allocations_batch" FOREIGN KEY ("batchId") REFERENCES "financial_allocation_batches"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_financial_payment_allocations_batch" ON "financial_payment_allocations" ("batchId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_financial_payment_allocations_batch"`,
    );
    await queryRunner.query(
      `ALTER TABLE "financial_payment_allocations" DROP CONSTRAINT "FK_financial_payment_allocations_batch"`,
    );
    await queryRunner.query(
      `ALTER TABLE "financial_payment_allocations" DROP COLUMN "batchId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_financial_allocation_batches_customer_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_financial_allocation_batches_request"`,
    );
    await queryRunner.query(`DROP TABLE "financial_allocation_batches"`);
  }
}
