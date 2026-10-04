import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentCancellationRequest1789800000000
  implements MigrationInterface
{
  name = 'AddPaymentCancellationRequest1789800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "financial_payments" ADD "cancellationRequestId" uuid`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_financial_payments_cancellation_request" ON "financial_payments" ("cancellationRequestId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."UQ_financial_payments_cancellation_request"`,
    );
    await queryRunner.query(
      `ALTER TABLE "financial_payments" DROP COLUMN "cancellationRequestId"`,
    );
  }
}
