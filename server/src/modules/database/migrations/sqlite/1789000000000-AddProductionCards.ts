import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductionCards1789000000000 implements MigrationInterface {
  name = 'AddProductionCards1789000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "production_cards" ("id" varchar PRIMARY KEY NOT NULL, "orderId" varchar NOT NULL, "stageId" varchar NOT NULL, "position" integer NOT NULL, "progressPercent" integer NOT NULL, "enteredStageAt" datetime NOT NULL, "version" integer NOT NULL DEFAULT 0, CONSTRAINT "FK_production_cards_order" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_production_cards_stage" FOREIGN KEY ("stageId") REFERENCES "production_stages" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_production_cards_order" ON "production_cards" ("orderId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_production_cards_stage_position_id" ON "production_cards" ("stageId", "position", "id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "production_cards"`);
  }
}
