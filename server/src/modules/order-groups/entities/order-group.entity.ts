import { CustomOrderStatus } from '../../order-management/entities/custom-order-status.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Order } from 'src/modules/orders/entities/order.entity';
import { DatabaseJsonColumn } from 'src/modules/database/database-json-column';
import {
  Column,
  JoinColumn,
  Index,
  ManyToOne,
  ManyToMany,
  JoinTable,
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
@Index('IDX_order_groups_custom_status', ['customStatusId'])
@Index('IDX_order_groups_customer', ['customerId'])
@Index('IDX_order_groups_status_due_date', ['status', 'dueDate'])
export class OrderGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', unique: true })
  orderNumber: string;

  @DatabaseJsonColumn({ defaultEmptyObject: true })
  customer: Record<string, any>;

  @Column({ type: 'uuid', nullable: true })
  customerId: string | null;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'customerId',
    foreignKeyConstraintName: 'FK_order_groups_customer',
  })
  customerRecord: Customer | null;

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

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'uuid', nullable: true })
  customStatusId: string | null;

  @ManyToOne(() => CustomOrderStatus, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'customStatusId',
    foreignKeyConstraintName: 'FK_order_groups_custom_status',
  })
  customStatus: CustomOrderStatus | null;

  @ManyToMany(() => CustomOrderStatus)
  @JoinTable({
    name: 'order_group_custom_statuses',
    joinColumn: { name: 'orderGroupId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'customStatusId', referencedColumnName: 'id' },
  })
  customStatuses: CustomOrderStatus[];

  @Column({ type: 'integer', default: 0 })
  managementVersion: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
