import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductionBoards1788900000000 implements MigrationInterface {
  name = 'AddProductionBoards1788900000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "production_boards" ("id" varchar PRIMARY KEY NOT NULL, "name" text NOT NULL, "description" text, "initialStageId" varchar, "version" integer NOT NULL DEFAULT 0, "archivedAt" datetime, CONSTRAINT "FK_production_boards_initial_stage" FOREIGN KEY ("initialStageId") REFERENCES "production_stages" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE TABLE "production_stages" ("id" varchar PRIMARY KEY NOT NULL, "boardId" varchar NOT NULL, "name" text NOT NULL, "color" text NOT NULL, "kind" text NOT NULL, "progressPercent" integer NOT NULL, "position" integer NOT NULL DEFAULT 0, "usedAt" datetime, "archivedAt" datetime, CONSTRAINT "CHK_production_stages_progress" CHECK (("kind" = 'queue' AND "progressPercent" = 0) OR ("kind" = 'active' AND "progressPercent" BETWEEN 1 AND 99) OR ("kind" = 'done' AND "progressPercent" = 100)), CONSTRAINT "FK_production_stages_board" FOREIGN KEY ("boardId") REFERENCES "production_boards" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_production_stages_board_position" ON "production_stages" ("boardId", "position")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "production_boards" SET "initialStageId" = NULL`,
    );
    await queryRunner.query(`DROP TABLE "production_stages"`);
    await queryRunner.query(`DROP TABLE "production_boards"`);
  }
}
