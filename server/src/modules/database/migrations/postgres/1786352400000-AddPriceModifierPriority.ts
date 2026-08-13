import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriceModifierPriority1786352400000
  implements MigrationInterface
{
  name = 'AddPriceModifierPriority1786352400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "price_modifiers" ADD "priority" integer NOT NULL DEFAULT 0',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "price_modifiers" DROP COLUMN "priority"',
    );
  }
}
