import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DatabaseJsonColumn } from '../../database/database-json-column';
import { getDatabaseKind } from '../../database/database-kind';
import { OrderGroup } from '../../order-groups/entities/order-group.entity';
import { Order } from '../../orders/entities/order.entity';
import type { RenderedMessagePart } from '../notification-rule.types';
import { NotificationRule } from './notification-rule.entity';

export interface NotificationTargetSnapshot {
  orderNumber: string | null;
  documentNumber: number | null;
  documentName: string | null;
}

@Entity('notifications')
@Index('UQ_notifications_dedup_key', ['dedupKey'], { unique: true })
@Index('IDX_notifications_feed', ['readAt', 'createdAt', 'id'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  dedupKey: string;

  @Column({ type: 'uuid', nullable: true })
  ruleId: string | null;

  @ManyToOne(() => NotificationRule, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'ruleId',
    foreignKeyConstraintName: 'FK_notifications_rule',
  })
  rule: NotificationRule | null;

  @Column({ type: 'integer' })
  ruleRevision: number;

  @Column({ type: 'integer', nullable: true })
  orderGroupId: number | null;

  @ManyToOne(() => OrderGroup, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'orderGroupId',
    foreignKeyConstraintName: 'FK_notifications_group',
  })
  orderGroup: OrderGroup | null;

  @Column({ type: 'uuid', nullable: true })
  orderId: string | null;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'orderId',
    foreignKeyConstraintName: 'FK_notifications_order',
  })
  order: Order | null;

  @Column({ type: 'text' })
  trigger: string;

  @Column({ type: 'text' })
  severity: string;

  @DatabaseJsonColumn({ defaultEmptyArray: true })
  message: RenderedMessagePart[];

  @DatabaseJsonColumn({ defaultEmptyObject: true })
  targetSnapshot: NotificationTargetSnapshot;

  @CreateDateColumn({
    type: getDatabaseKind() === 'postgres' ? 'timestamptz' : 'datetime',
  })
  createdAt: Date;

  @Column({
    type: getDatabaseKind() === 'postgres' ? 'timestamptz' : 'datetime',
    nullable: true,
  })
  readAt: Date | null;

  @Column({
    type: getDatabaseKind() === 'postgres' ? 'timestamptz' : 'datetime',
    nullable: true,
  })
  resolvedAt: Date | null;
}
