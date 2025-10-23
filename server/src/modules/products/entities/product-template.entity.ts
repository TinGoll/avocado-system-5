import { PriceModifier } from 'src/modules/price-modifiers/entities/price-modifier.entity';
import { ProductionOperation } from 'src/modules/production-operations/entities/production-operation.entity';
import { ColumnNumericTransformer } from 'src/shared/utils/column.transformer';
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
  AREA = 'area',
  VOLUME = 'volume',
}

@Entity('product_templates')
export class ProductTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({
    type: 'jsonb',
    default: {},
    comment: 'Характеристики по умолчанию для этого шаблона продукта',
  })
  defaultCharacteristics: Record<string, string | number | boolean>;

  @Column({
    type: 'enum',
    enum: CustomerPricingMethod,
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

  @Column({ type: 'jsonb', default: {} })
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
