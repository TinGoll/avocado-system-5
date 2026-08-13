import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClientErrors1786630000000 implements MigrationInterface {
  name = 'AddClientErrors1786630000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "client_errors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "message" text NOT NULL, "stack" text, "componentStack" text, "url" text NOT NULL, "userAgent" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_client_errors" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_client_errors_createdAt" ON "client_errors" ("createdAt")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_client_errors_createdAt"`);
    await queryRunner.query(`DROP TABLE "client_errors"`);
  }
}
