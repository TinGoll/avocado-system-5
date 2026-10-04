import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFinancialAllocationBatches1789900000000
  implements MigrationInterface
{
  name = 'AddFinancialAllocationBatches1789900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "financial_allocation_batches" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "customerId" varchar NOT NULL,
        "requestId" varchar NOT NULL,
        "comment" text,
        "authorName" text,
        "totalMinor" bigint NOT NULL,
        "balanceAfterMinor" bigint NOT NULL,
        "requestSnapshot" text NOT NULL,
        "resultSnapshot" text NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
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
      `CREATE TABLE "temporary_financial_payment_allocations" (
        "id" varchar PRIMARY KEY NOT NULL,
        "paymentId" varchar NOT NULL,
        "accrualId" varchar NOT NULL,
        "amountMinor" bigint NOT NULL,
        "status" text NOT NULL DEFAULT ('active'),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "releasedAt" datetime,
        "releaseReason" text,
        "batchId" integer,
        CONSTRAINT "CHK_financial_payment_allocations_amount" CHECK (("amountMinor" > 0)),
        CONSTRAINT "CHK_financial_payment_allocations_status" CHECK (("status" IN ('active', 'released'))),
        CONSTRAINT "FK_financial_payment_allocations_payment" FOREIGN KEY ("paymentId") REFERENCES "financial_payments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_financial_payment_allocations_accrual" FOREIGN KEY ("accrualId") REFERENCES "financial_accruals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_financial_payment_allocations_batch" FOREIGN KEY ("batchId") REFERENCES "financial_allocation_batches"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_financial_payment_allocations" ("id", "paymentId", "accrualId", "amountMinor", "status", "createdAt", "releasedAt", "releaseReason", "batchId") SELECT "id", "paymentId", "accrualId", "amountMinor", "status", "createdAt", "releasedAt", "releaseReason", NULL FROM "financial_payment_allocations"`,
    );
    await queryRunner.query(`DROP TABLE "financial_payment_allocations"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_financial_payment_allocations" RENAME TO "financial_payment_allocations"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_financial_payment_allocations_payment_status" ON "financial_payment_allocations" ("paymentId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_financial_payment_allocations_accrual_status" ON "financial_payment_allocations" ("accrualId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_financial_payment_allocations_batch" ON "financial_payment_allocations" ("batchId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_financial_payment_allocations_batch"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_financial_payment_allocations_accrual_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_financial_payment_allocations_payment_status"`,
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_financial_payment_allocations" (
        "id" varchar PRIMARY KEY NOT NULL,
        "paymentId" varchar NOT NULL,
        "accrualId" varchar NOT NULL,
        "amountMinor" bigint NOT NULL,
        "status" text NOT NULL DEFAULT ('active'),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "releasedAt" datetime,
        "releaseReason" text,
        CONSTRAINT "CHK_financial_payment_allocations_amount" CHECK (("amountMinor" > 0)),
        CONSTRAINT "CHK_financial_payment_allocations_status" CHECK (("status" IN ('active', 'released'))),
        CONSTRAINT "FK_financial_payment_allocations_payment" FOREIGN KEY ("paymentId") REFERENCES "financial_payments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_financial_payment_allocations_accrual" FOREIGN KEY ("accrualId") REFERENCES "financial_accruals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_financial_payment_allocations" ("id", "paymentId", "accrualId", "amountMinor", "status", "createdAt", "releasedAt", "releaseReason") SELECT "id", "paymentId", "accrualId", "amountMinor", "status", "createdAt", "releasedAt", "releaseReason" FROM "financial_payment_allocations"`,
    );
    await queryRunner.query(`DROP TABLE "financial_payment_allocations"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_financial_payment_allocations" RENAME TO "financial_payment_allocations"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_financial_payment_allocations_payment_status" ON "financial_payment_allocations" ("paymentId", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_financial_payment_allocations_accrual_status" ON "financial_payment_allocations" ("accrualId", "status")`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_financial_allocation_batches_customer_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "UQ_financial_allocation_batches_request"`,
    );
    await queryRunner.query(`DROP TABLE "financial_allocation_batches"`);
  }
}
