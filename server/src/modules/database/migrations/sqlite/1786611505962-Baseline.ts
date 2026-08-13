import { MigrationInterface, QueryRunner } from 'typeorm';

export class Baseline1786611505962 implements MigrationInterface {
  name = 'Baseline1786611505962';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "varnishes" ("id" varchar PRIMARY KEY NOT NULL, "name" text NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_2800c6e4886f310aac109d3227d" UNIQUE ("name"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "price_modifiers" ("id" varchar PRIMARY KEY NOT NULL, "name" text NOT NULL, "type" varchar CHECK( "type" IN ('percentage','fixed_amount') ) NOT NULL, "value" decimal(10,2) NOT NULL, "priority" integer NOT NULL DEFAULT (0), "conditions" text NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_3f4228ecff908718aae2c07e2f7" UNIQUE ("name"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "production_operations" ("id" varchar PRIMARY KEY NOT NULL, "name" text NOT NULL, "calculationMethod" varchar CHECK( "calculationMethod" IN ('per_item','area','volume') ) NOT NULL DEFAULT ('per_item'), "costPerUnit" decimal(10,2) NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_38e5174f679205e0dc7db9791c1" UNIQUE ("name"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_templates" ("id" varchar PRIMARY KEY NOT NULL, "name" text NOT NULL, "group" text, "defaultCharacteristics" text NOT NULL DEFAULT ('{}'), "customerPricingMethod" varchar CHECK( "customerPricingMethod" IN ('per_item','linear_meter','area','volume') ) NOT NULL DEFAULT ('per_item'), "baseCustomerPrice" decimal(10,2) NOT NULL DEFAULT (0), "attributes" text NOT NULL DEFAULT ('{}'), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_4dcb42254b0a020452ca442f4ed" UNIQUE ("name"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "patinas" ("id" varchar PRIMARY KEY NOT NULL, "name" text NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_f406a0c5de2d2a7f8deced64f61" UNIQUE ("name"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "panels" ("id" varchar PRIMARY KEY NOT NULL, "name" text NOT NULL, "characteristics" text NOT NULL DEFAULT ('{}'), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_64e68aacc008309a91581cfc690" UNIQUE ("name"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_items" ("id" varchar PRIMARY KEY NOT NULL, "quantity" integer NOT NULL, "position" integer NOT NULL DEFAULT (0), "snapshot" text NOT NULL, "characteristics" text NOT NULL DEFAULT ('{}'), "calculatedProductionCost" decimal(10,2) NOT NULL DEFAULT (0), "calculatedCustomerPrice" decimal(10,2) NOT NULL DEFAULT (0), "orderId" varchar, "templateId" varchar)`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_groups" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "orderNumber" text NOT NULL, "customer" text NOT NULL DEFAULT ('{}'), "status" varchar CHECK( "status" IN ('draft','in_production','completed','cancelled') ) NOT NULL DEFAULT ('draft'), "startedAt" date, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_ceb2435e900dbcef7438b5a66c9" UNIQUE ("orderNumber"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "orders" ("id" varchar PRIMARY KEY NOT NULL, "name" text, "characteristics" text NOT NULL DEFAULT ('{}'), "totalPrice" decimal(12,2) NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "orderGroupId" integer)`,
    );
    await queryRunner.query(
      `CREATE TABLE "materials" ("id" varchar PRIMARY KEY NOT NULL, "name" text NOT NULL, "type" text NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_9b614bb357c5d8741a1a381385c" UNIQUE ("name"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "facade_profiles" ("id" varchar PRIMARY KEY NOT NULL, "name" text NOT NULL, "characteristics" text NOT NULL DEFAULT ('{}'), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_75fb3d84875ce883f5074840522" UNIQUE ("name"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "colors" ("id" varchar PRIMARY KEY NOT NULL, "name" text NOT NULL, "type" text NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_cf12321fa0b7b9539e89c7dfeb7" UNIQUE ("name"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "customers" ("id" varchar PRIMARY KEY NOT NULL, "name" text NOT NULL, "level" varchar CHECK( "level" IN ('bronze','silver','gold') ) NOT NULL, CONSTRAINT "UQ_b942d55b92ededa770041db9ded" UNIQUE ("name"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "price_modifiers_product_templates_product_templates" ("priceModifiersId" varchar NOT NULL, "productTemplatesId" varchar NOT NULL, PRIMARY KEY ("priceModifiersId", "productTemplatesId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3152da7d6c68c4427b2ed27ebb" ON "price_modifiers_product_templates_product_templates" ("priceModifiersId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_194e0911d5fb73c9f6ad5b689c" ON "price_modifiers_product_templates_product_templates" ("productTemplatesId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "product_templates_operations_production_operations" ("productTemplatesId" varchar NOT NULL, "productionOperationsId" varchar NOT NULL, PRIMARY KEY ("productTemplatesId", "productionOperationsId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1cb04ae91c1adfbbbded335489" ON "product_templates_operations_production_operations" ("productTemplatesId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0b9df6915a1b9ae897db6b55b9" ON "product_templates_operations_production_operations" ("productionOperationsId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_order_items" ("id" varchar PRIMARY KEY NOT NULL, "quantity" integer NOT NULL, "position" integer NOT NULL DEFAULT (0), "snapshot" text NOT NULL, "characteristics" text NOT NULL DEFAULT ('{}'), "calculatedProductionCost" decimal(10,2) NOT NULL DEFAULT (0), "calculatedCustomerPrice" decimal(10,2) NOT NULL DEFAULT (0), "orderId" varchar, "templateId" varchar, CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d" FOREIGN KEY ("orderId") REFERENCES "orders" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_bfa6975708144d105f97a1438ff" FOREIGN KEY ("templateId") REFERENCES "product_templates" ("id") ON DELETE SET NULL ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_order_items"("id", "quantity", "position", "snapshot", "characteristics", "calculatedProductionCost", "calculatedCustomerPrice", "orderId", "templateId") SELECT "id", "quantity", "position", "snapshot", "characteristics", "calculatedProductionCost", "calculatedCustomerPrice", "orderId", "templateId" FROM "order_items"`,
    );
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_order_items" RENAME TO "order_items"`,
    );
    await queryRunner.query(
      `CREATE TABLE "temporary_orders" ("id" varchar PRIMARY KEY NOT NULL, "name" text, "characteristics" text NOT NULL DEFAULT ('{}'), "totalPrice" decimal(12,2) NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "orderGroupId" integer, CONSTRAINT "FK_a34ba12ea420c9bc02ae8fb6f6d" FOREIGN KEY ("orderGroupId") REFERENCES "order_groups" ("id") ON DELETE SET NULL ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_orders"("id", "name", "characteristics", "totalPrice", "createdAt", "updatedAt", "orderGroupId") SELECT "id", "name", "characteristics", "totalPrice", "createdAt", "updatedAt", "orderGroupId" FROM "orders"`,
    );
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(
      `ALTER TABLE "temporary_orders" RENAME TO "orders"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_3152da7d6c68c4427b2ed27ebb"`);
    await queryRunner.query(`DROP INDEX "IDX_194e0911d5fb73c9f6ad5b689c"`);
    await queryRunner.query(
      `CREATE TABLE "temporary_price_modifiers_product_templates_product_templates" ("priceModifiersId" varchar NOT NULL, "productTemplatesId" varchar NOT NULL, CONSTRAINT "FK_3152da7d6c68c4427b2ed27ebb3" FOREIGN KEY ("priceModifiersId") REFERENCES "price_modifiers" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_194e0911d5fb73c9f6ad5b689ca" FOREIGN KEY ("productTemplatesId") REFERENCES "product_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("priceModifiersId", "productTemplatesId"))`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_price_modifiers_product_templates_product_templates"("priceModifiersId", "productTemplatesId") SELECT "priceModifiersId", "productTemplatesId" FROM "price_modifiers_product_templates_product_templates"`,
    );
    await queryRunner.query(
      `DROP TABLE "price_modifiers_product_templates_product_templates"`,
    );
    await queryRunner.query(
      `ALTER TABLE "temporary_price_modifiers_product_templates_product_templates" RENAME TO "price_modifiers_product_templates_product_templates"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3152da7d6c68c4427b2ed27ebb" ON "price_modifiers_product_templates_product_templates" ("priceModifiersId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_194e0911d5fb73c9f6ad5b689c" ON "price_modifiers_product_templates_product_templates" ("productTemplatesId") `,
    );
    await queryRunner.query(`DROP INDEX "IDX_1cb04ae91c1adfbbbded335489"`);
    await queryRunner.query(`DROP INDEX "IDX_0b9df6915a1b9ae897db6b55b9"`);
    await queryRunner.query(
      `CREATE TABLE "temporary_product_templates_operations_production_operations" ("productTemplatesId" varchar NOT NULL, "productionOperationsId" varchar NOT NULL, CONSTRAINT "FK_1cb04ae91c1adfbbbded3354896" FOREIGN KEY ("productTemplatesId") REFERENCES "product_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_0b9df6915a1b9ae897db6b55b95" FOREIGN KEY ("productionOperationsId") REFERENCES "production_operations" ("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("productTemplatesId", "productionOperationsId"))`,
    );
    await queryRunner.query(
      `INSERT INTO "temporary_product_templates_operations_production_operations"("productTemplatesId", "productionOperationsId") SELECT "productTemplatesId", "productionOperationsId" FROM "product_templates_operations_production_operations"`,
    );
    await queryRunner.query(
      `DROP TABLE "product_templates_operations_production_operations"`,
    );
    await queryRunner.query(
      `ALTER TABLE "temporary_product_templates_operations_production_operations" RENAME TO "product_templates_operations_production_operations"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1cb04ae91c1adfbbbded335489" ON "product_templates_operations_production_operations" ("productTemplatesId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0b9df6915a1b9ae897db6b55b9" ON "product_templates_operations_production_operations" ("productionOperationsId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_0b9df6915a1b9ae897db6b55b9"`);
    await queryRunner.query(`DROP INDEX "IDX_1cb04ae91c1adfbbbded335489"`);
    await queryRunner.query(
      `ALTER TABLE "product_templates_operations_production_operations" RENAME TO "temporary_product_templates_operations_production_operations"`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_templates_operations_production_operations" ("productTemplatesId" varchar NOT NULL, "productionOperationsId" varchar NOT NULL, PRIMARY KEY ("productTemplatesId", "productionOperationsId"))`,
    );
    await queryRunner.query(
      `INSERT INTO "product_templates_operations_production_operations"("productTemplatesId", "productionOperationsId") SELECT "productTemplatesId", "productionOperationsId" FROM "temporary_product_templates_operations_production_operations"`,
    );
    await queryRunner.query(
      `DROP TABLE "temporary_product_templates_operations_production_operations"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0b9df6915a1b9ae897db6b55b9" ON "product_templates_operations_production_operations" ("productionOperationsId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1cb04ae91c1adfbbbded335489" ON "product_templates_operations_production_operations" ("productTemplatesId") `,
    );
    await queryRunner.query(`DROP INDEX "IDX_194e0911d5fb73c9f6ad5b689c"`);
    await queryRunner.query(`DROP INDEX "IDX_3152da7d6c68c4427b2ed27ebb"`);
    await queryRunner.query(
      `ALTER TABLE "price_modifiers_product_templates_product_templates" RENAME TO "temporary_price_modifiers_product_templates_product_templates"`,
    );
    await queryRunner.query(
      `CREATE TABLE "price_modifiers_product_templates_product_templates" ("priceModifiersId" varchar NOT NULL, "productTemplatesId" varchar NOT NULL, PRIMARY KEY ("priceModifiersId", "productTemplatesId"))`,
    );
    await queryRunner.query(
      `INSERT INTO "price_modifiers_product_templates_product_templates"("priceModifiersId", "productTemplatesId") SELECT "priceModifiersId", "productTemplatesId" FROM "temporary_price_modifiers_product_templates_product_templates"`,
    );
    await queryRunner.query(
      `DROP TABLE "temporary_price_modifiers_product_templates_product_templates"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_194e0911d5fb73c9f6ad5b689c" ON "price_modifiers_product_templates_product_templates" ("productTemplatesId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3152da7d6c68c4427b2ed27ebb" ON "price_modifiers_product_templates_product_templates" ("priceModifiersId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" RENAME TO "temporary_orders"`,
    );
    await queryRunner.query(
      `CREATE TABLE "orders" ("id" varchar PRIMARY KEY NOT NULL, "name" text, "characteristics" text NOT NULL DEFAULT ('{}'), "totalPrice" decimal(12,2) NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "orderGroupId" integer)`,
    );
    await queryRunner.query(
      `INSERT INTO "orders"("id", "name", "characteristics", "totalPrice", "createdAt", "updatedAt", "orderGroupId") SELECT "id", "name", "characteristics", "totalPrice", "createdAt", "updatedAt", "orderGroupId" FROM "temporary_orders"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_orders"`);
    await queryRunner.query(
      `ALTER TABLE "order_items" RENAME TO "temporary_order_items"`,
    );
    await queryRunner.query(
      `CREATE TABLE "order_items" ("id" varchar PRIMARY KEY NOT NULL, "quantity" integer NOT NULL, "position" integer NOT NULL DEFAULT (0), "snapshot" text NOT NULL, "characteristics" text NOT NULL DEFAULT ('{}'), "calculatedProductionCost" decimal(10,2) NOT NULL DEFAULT (0), "calculatedCustomerPrice" decimal(10,2) NOT NULL DEFAULT (0), "orderId" varchar, "templateId" varchar)`,
    );
    await queryRunner.query(
      `INSERT INTO "order_items"("id", "quantity", "position", "snapshot", "characteristics", "calculatedProductionCost", "calculatedCustomerPrice", "orderId", "templateId") SELECT "id", "quantity", "position", "snapshot", "characteristics", "calculatedProductionCost", "calculatedCustomerPrice", "orderId", "templateId" FROM "temporary_order_items"`,
    );
    await queryRunner.query(`DROP TABLE "temporary_order_items"`);
    await queryRunner.query(`DROP INDEX "IDX_0b9df6915a1b9ae897db6b55b9"`);
    await queryRunner.query(`DROP INDEX "IDX_1cb04ae91c1adfbbbded335489"`);
    await queryRunner.query(
      `DROP TABLE "product_templates_operations_production_operations"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_194e0911d5fb73c9f6ad5b689c"`);
    await queryRunner.query(`DROP INDEX "IDX_3152da7d6c68c4427b2ed27ebb"`);
    await queryRunner.query(
      `DROP TABLE "price_modifiers_product_templates_product_templates"`,
    );
    await queryRunner.query(`DROP TABLE "customers"`);
    await queryRunner.query(`DROP TABLE "colors"`);
    await queryRunner.query(`DROP TABLE "facade_profiles"`);
    await queryRunner.query(`DROP TABLE "materials"`);
    await queryRunner.query(`DROP TABLE "orders"`);
    await queryRunner.query(`DROP TABLE "order_groups"`);
    await queryRunner.query(`DROP TABLE "order_items"`);
    await queryRunner.query(`DROP TABLE "panels"`);
    await queryRunner.query(`DROP TABLE "patinas"`);
    await queryRunner.query(`DROP TABLE "product_templates"`);
    await queryRunner.query(`DROP TABLE "production_operations"`);
    await queryRunner.query(`DROP TABLE "price_modifiers"`);
    await queryRunner.query(`DROP TABLE "varnishes"`);
  }
}
