import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFinancialCore1789700000000 implements MigrationInterface {
  name = 'AddFinancialCore1789700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "financial_accruals" (
        "id" varchar PRIMARY KEY NOT NULL,
        "customerId" varchar NOT NULL,
        "sourceType" text NOT NULL,
        "orderGroupId" integer,
        "title" text NOT NULL,
        "status" text NOT NULL DEFAULT 'active',
        "version" integer NOT NULL DEFAULT 0,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "cancelledAt" datetime,
        "cancellationReason" text,
        CONSTRAINT "CHK_financial_accruals_source_type" CHECK ("sourceType" IN ('order', 'manual')),
        CONSTRAINT "CHK_financial_accruals_source_order" CHECK (("sourceType" = 'order' AND "orderGroupId" IS NOT NULL) OR ("sourceType" = 'manual' AND "orderGroupId" IS NULL)),
        CONSTRAINT "CHK_financial_accruals_status" CHECK ("status" IN ('active', 'cancelled')),
        CONSTRAINT "FK_financial_accruals_customer" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_financial_accruals_order_group" FOREIGN KEY ("orderGroupId") REFERENCES "order_groups"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `CREATE TABLE "financial_accrual_entries" (
        "id" varchar PRIMARY KEY NOT NULL,
        "accrualId" varchar NOT NULL,
        "kind" text NOT NULL,
        "amountMinor" bigint NOT NULL,
        "effectiveDate" date NOT NULL,
        "reason" text,
        "reversesEntryId" varchar,
        "requestId" varchar NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "CHK_financial_accrual_entries_kind" CHECK ("kind" IN ('initial', 'adjustment', 'reversal')),
        CONSTRAINT "CHK_financial_accrual_entries_amount" CHECK ("amountMinor" <> 0),
        CONSTRAINT "CHK_financial_accrual_entries_initial_amount" CHECK ("kind" <> 'initial' OR "amountMinor" > 0),
        CONSTRAINT "FK_financial_accrual_entries_accrual" FOREIGN KEY ("accrualId") REFERENCES "financial_accruals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_financial_accrual_entries_reverses" FOREIGN KEY ("reversesEntryId") REFERENCES "financial_accrual_entries"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `CREATE TABLE "financial_payments" (
        "id" varchar PRIMARY KEY NOT NULL,
        "customerId" varchar NOT NULL,
        "amountMinor" bigint NOT NULL,
        "paymentDate" date NOT NULL,
        "method" text NOT NULL,
        "externalReference" text,
        "comment" text,
        "status" text NOT NULL DEFAULT 'posted',
        "version" integer NOT NULL DEFAULT 0,
        "requestId" varchar NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "cancelledAt" datetime,
        "cancellationDate" date,
        "cancellationReason" text,
        CONSTRAINT "CHK_financial_payments_amount" CHECK ("amountMinor" > 0),
        CONSTRAINT "CHK_financial_payments_method" CHECK ("method" IN ('cash', 'card', 'bank_transfer', 'other')),
        CONSTRAINT "CHK_financial_payments_status" CHECK ("status" IN ('posted', 'cancelled')),
        CONSTRAINT "FK_financial_payments_customer" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )`,
    );
    await queryRunner.query(
      `CREATE TABLE "financial_payment_allocations" (
        "id" varchar PRIMARY KEY NOT NULL,
        "paymentId" varchar NOT NULL,
        "accrualId" varchar NOT NULL,
        "amountMinor" bigint NOT NULL,
        "status" text NOT NULL DEFAULT 'active',
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "releasedAt" datetime,
        "releaseReason" text,
        CONSTRAINT "CHK_financial_payment_allocations_amount" CHECK ("amountMinor" > 0),
        CONSTRAINT "CHK_financial_payment_allocations_status" CHECK ("status" IN ('active', 'released')),
        CONSTRAINT "FK_financial_payment_allocations_payment" FOREIGN KEY ("paymentId") REFERENCES "financial_payments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_financial_payment_allocations_accrual" FOREIGN KEY ("accrualId") REFERENCES "financial_accruals"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )`,
    );

    for (const query of [
      `CREATE INDEX "IDX_financial_accruals_customer_status_created" ON "financial_accruals" ("customerId", "status", "createdAt", "id")`,
      `CREATE UNIQUE INDEX "UQ_financial_accruals_order_group" ON "financial_accruals" ("orderGroupId")`,
      `CREATE INDEX "IDX_financial_accrual_entries_accrual_effective" ON "financial_accrual_entries" ("accrualId", "effectiveDate", "id")`,
      `CREATE INDEX "IDX_financial_accrual_entries_effective" ON "financial_accrual_entries" ("effectiveDate", "id")`,
      `CREATE UNIQUE INDEX "UQ_financial_accrual_entries_request" ON "financial_accrual_entries" ("requestId")`,
      `CREATE UNIQUE INDEX "UQ_financial_accrual_entries_reverses" ON "financial_accrual_entries" ("reversesEntryId")`,
      `CREATE INDEX "IDX_financial_payments_customer_date" ON "financial_payments" ("customerId", "paymentDate", "id")`,
      `CREATE INDEX "IDX_financial_payments_date" ON "financial_payments" ("paymentDate", "id")`,
      `CREATE INDEX "IDX_financial_payments_method_date" ON "financial_payments" ("method", "paymentDate", "id")`,
      `CREATE UNIQUE INDEX "UQ_financial_payments_request" ON "financial_payments" ("requestId")`,
      `CREATE INDEX "IDX_financial_payment_allocations_payment_status" ON "financial_payment_allocations" ("paymentId", "status")`,
      `CREATE INDEX "IDX_financial_payment_allocations_accrual_status" ON "financial_payment_allocations" ("accrualId", "status")`,
    ]) {
      await queryRunner.query(query);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "financial_payment_allocations"`);
    await queryRunner.query(`DROP TABLE "financial_payments"`);
    await queryRunner.query(`DROP TABLE "financial_accrual_entries"`);
    await queryRunner.query(`DROP TABLE "financial_accruals"`);
  }
}
