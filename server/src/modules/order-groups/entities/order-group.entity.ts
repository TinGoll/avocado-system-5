import { Order } from 'src/modules/orders/entities/order.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('order_groups')
export class OrderGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'jsonb', default: {} })
  customer: Record<string, any>;

  @OneToMany(() => Order, (order) => order.orderGroup)
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
