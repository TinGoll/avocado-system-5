import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, comment: 'Уникальный номер заказа для клиента' })
  orderNumber: string;

  @Column({ comment: 'Имя или ID заказчика' })
  customer: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'float', default: 0, comment: 'Итоговая сумма всего заказа' })
  totalAmount: number;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
  })
  items: OrderItem[];
}
