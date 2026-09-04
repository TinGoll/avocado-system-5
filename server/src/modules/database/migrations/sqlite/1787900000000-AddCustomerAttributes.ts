import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerAttributes1787900000000 implements MigrationInterface {
  name = 'AddCustomerAttributes1787900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customers" ADD "attributes" text NOT NULL DEFAULT ('{}')`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "customers" DROP COLUMN "attributes"`,
    );
  }
}
