import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderGroupComment1787000000000 implements MigrationInterface {
  name = 'AddOrderGroupComment1787000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_groups" ADD "comment" text`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order_groups" DROP COLUMN "comment"`);
  }
}
