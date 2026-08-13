import { PriceModifier } from 'src/modules/price-modifiers/entities/price-modifier.entity';
import { ProductionOperation } from 'src/modules/production-operations/entities/production-operation.entity';
import { ColumnNumericTransformer } from 'src/shared/utils/column.transformer';
import { DatabaseJsonColumn } from 'src/modules/database/database-json-column';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CustomerPricingMethod {
  PER_ITEM = 'per_item',
  LINEAR_METER = 'linear_meter',
  AREA = 'area',
  VOLUME = 'volume',
}

@Entity('product_templates')
export class ProductTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  group?: string;

  @DatabaseJsonColumn({
    defaultEmptyObject: true,
    comment: 'Характеристики по умолчанию для этого шаблона продукта',
  })
  defaultCharacteristics: Record<string, string | number | boolean>;

  @Column({
    type: 'simple-enum',
    enum: CustomerPricingMethod,
    enumName: 'product_templates_customerpricingmethod_enum',
    default: CustomerPricingMethod.PER_ITEM,
  })
  customerPricingMethod: CustomerPricingMethod;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  baseCustomerPrice: number;

  @DatabaseJsonColumn({ defaultEmptyObject: true })
  attributes: object;

  @ManyToMany(() => ProductionOperation, { eager: true })
  @JoinTable()
  operations: ProductionOperation[];

  @ManyToMany(() => PriceModifier, (modifier) => modifier.productTemplates)
  priceModifiers: PriceModifier[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
