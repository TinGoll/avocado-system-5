import { Order } from 'src/modules/orders/entities/order.entity';
import { DatabaseJsonColumn } from 'src/modules/database/database-json-column';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OrderStatus {
  DRAFT = 'draft',
  IN_PRODUCTION = 'in_production',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('order_groups')
export class OrderGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', unique: true })
  orderNumber: string;

  @DatabaseJsonColumn({ defaultEmptyObject: true })
  customer: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @Column({
    type: 'simple-enum',
    enum: OrderStatus,
    enumName: 'order_groups_status_enum',
    default: OrderStatus.DRAFT,
  })
  status: OrderStatus;

  @Column({
    type: 'date',
    nullable: true,
  })
  startedAt?: Date;

  @OneToMany(() => Order, (order) => order.orderGroup)
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
