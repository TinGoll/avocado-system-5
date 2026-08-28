import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from './order.entity';
import {
  CustomerPricingMethod,
  ProductTemplate,
} from 'src/modules/products/entities/product-template.entity';
import { ColumnNumericTransformer } from 'src/shared/utils/column.transformer';
import { DatabaseJsonColumn } from 'src/modules/database/database-json-column';
import { CalculationMethod } from 'src/modules/production-operations/entities/production-operation.entity';

export type OrderItemProductionOperationResult = {
  operationId: string;
  originalName: string;
  calculationFormula: string;
  displayNameTemplate: string;
  calculationMethod: CalculationMethod;
  costPerUnit: number;
  calculatedQuantity: number;
  renderedName: string;
  totalCost: number;
};

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

  @Column({ type: 'int', default: 0 })
  position: number;

  @DatabaseJsonColumn()
  snapshot: Snapshot;

  @DatabaseJsonColumn({ defaultEmptyObject: true })
  characteristics: Record<string, string | number | boolean>;

  @DatabaseJsonColumn({ defaultEmptyArray: true })
  productionOperationResults: OrderItemProductionOperationResult[];

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
