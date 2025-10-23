import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import type { PriceModifierCondition } from '../types/price-modifier-condition.type';
import { ColumnNumericTransformer } from 'src/shared/utils/column.transformer';
import { ProductTemplate } from 'src/modules/products/entities/product-template.entity';

export enum ConditionSource {
  ORDER = 'order',
  ITEM = 'item',
}

export enum ConditionOperator {
  EQ = 'eq', // Равно
  GT = 'gt', // Больше
  LT = 'lt', // Меньше
  GTE = 'gte', // Больше или равно
  LTE = 'lte', // Меньше или равно
}

export enum ModifierType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
}

@Entity('price_modifiers')
export class PriceModifier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'enum', enum: ModifierType })
  type: ModifierType;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  value: number;

  @Column({ type: 'jsonb' })
  conditions: PriceModifierCondition;

  @ManyToMany(() => ProductTemplate, { nullable: true })
  @JoinTable()
  productTemplates: ProductTemplate[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
