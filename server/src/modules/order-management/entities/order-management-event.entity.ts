import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderGroup } from '../../order-groups/entities/order-group.entity';
import { Order } from '../../orders/entities/order.entity';
import { DatabaseJsonColumn } from '../../database/database-json-column';
import { getDatabaseKind } from '../../database/database-kind';

export type OrderManagementEventType =
  | 'due_date_changed'
  | 'custom_status_changed'
  | 'lifecycle_changed'
  | 'stage_changed'
  | 'board_assigned'
  | 'board_removed'
  | 'board_changed'
  | 'group_deleted'
  | 'document_deleted';

export type ManagementEventValue =
  | string
  | number
  | boolean
  | null
  | ManagementEventValue[]
  | { [key: string]: ManagementEventValue };
export type ManagementEventSnapshot = Record<string, ManagementEventValue>;

export interface OrderManagementTargetSnapshot {
  orderNumber: string | null;
  documentNumber: number | null;
  documentName: string | null;
}

@Entity('order_management_events')
@Index('IDX_management_events_pending', [
  'notificationProcessedAt',
  'occurredAt',
  'id',
])
@Index('IDX_management_events_group', ['orderGroupId', 'occurredAt', 'id'])
@Index('IDX_management_events_order', ['orderId', 'occurredAt', 'id'])
export class OrderManagementEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer', nullable: true })
  orderGroupId: number | null;

  @ManyToOne(() => OrderGroup, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'orderGroupId',
    foreignKeyConstraintName: 'FK_management_events_group',
  })
  orderGroup: OrderGroup | null;

  @Column({ type: 'uuid', nullable: true })
  orderId: string | null;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'orderId',
    foreignKeyConstraintName: 'FK_management_events_order',
  })
  order: Order | null;

  @Column({ type: 'text' })
  type: OrderManagementEventType;

  @DatabaseJsonColumn()
  before: ManagementEventSnapshot;

  @DatabaseJsonColumn()
  after: ManagementEventSnapshot;

  @DatabaseJsonColumn()
  targetSnapshot: OrderManagementTargetSnapshot;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({
    type: getDatabaseKind() === 'postgres' ? 'timestamptz' : 'datetime',
  })
  occurredAt: Date;

  @Column({
    type: getDatabaseKind() === 'postgres' ? 'timestamptz' : 'datetime',
    nullable: true,
  })
  notificationProcessedAt: Date | null;
}
