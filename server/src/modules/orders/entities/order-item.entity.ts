import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from './order.entity';
import {
  CustomerPricingMethod,
  ProductTemplate,
} from 'src/modules/products/entities/product-template.entity';
import { ColumnNumericTransformer } from 'src/shared/utils/column.transformer';

type Snapshot = {
  name: string;
  baseCustomerPrice: number;
  attributes: object;
  customerPricingMethod: CustomerPricingMethod;
  defaultCharacteristics: Record<string, string | number | boolean>;
};

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items)
  order: Order;

  @ManyToOne(() => ProductTemplate, { nullable: true, onDelete: 'SET NULL' })
  template: ProductTemplate;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'jsonb' })
  snapshot: Snapshot;

  @Column({ type: 'jsonb', default: {} })
  characteristics: Record<string, string | number | boolean>;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  calculatedProductionCost: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  calculatedCustomerPrice: number;
}
