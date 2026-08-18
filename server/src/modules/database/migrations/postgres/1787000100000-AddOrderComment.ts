import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderComment1787000100000 implements MigrationInterface {
  name = 'AddOrderComment1787000100000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" ADD "comment" text`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "comment"`);
  }
}
