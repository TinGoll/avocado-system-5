import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerDetails1787800000000 implements MigrationInterface {
  name = 'AddCustomerDetails1787800000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "customers" ADD "companyName" text`);
    await queryRunner.query(`ALTER TABLE "customers" ADD "address" text`);
    await queryRunner.query(`ALTER TABLE "customers" ADD "phone" text`);
    await queryRunner.query(`ALTER TABLE "customers" ADD "email" text`);
    await queryRunner.query(`ALTER TABLE "customers" ADD "comment" text`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "comment"`);
    await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "email"`);
    await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "phone"`);
    await queryRunner.query(`ALTER TABLE "customers" DROP COLUMN "address"`);
    await queryRunner.query(
      `ALTER TABLE "customers" DROP COLUMN "companyName"`,
    );
  }
}
