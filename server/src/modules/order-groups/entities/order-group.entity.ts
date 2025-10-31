import { Order } from 'src/modules/orders/entities/order.entity';
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

  @Column({ type: 'jsonb', default: {} })
  customer: Record<string, any>;

  @Column({
    type: 'enum',
    enum: OrderStatus,
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
