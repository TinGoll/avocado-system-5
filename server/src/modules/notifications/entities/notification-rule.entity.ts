import { Check, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DatabaseJsonColumn } from '../../database/database-json-column';
import { getDatabaseKind } from '../../database/database-kind';
import type { NotificationRuleConditions } from '../notification-rule.types';

export type NotificationScope = 'group' | 'document';
export type NotificationTrigger =
  | 'due_soon'
  | 'overdue'
  | 'stage_stalled'
  | 'stage_changed'
  | 'custom_status_changed'
  | 'lifecycle_changed';
export type NotificationRepeat = 'once' | 'daily';
export type NotificationSeverity = 'info' | 'warning' | 'error';

@Entity('notification_rules')
@Check('CHK_notification_rules_scope', `"scope" IN ('group', 'document')`)
@Check(
  'CHK_notification_rules_trigger',
  `"trigger" IN ('due_soon', 'overdue', 'stage_stalled', 'stage_changed', 'custom_status_changed', 'lifecycle_changed')`,
)
@Check('CHK_notification_rules_repeat', `"repeat" IN ('once', 'daily')`)
@Check(
  'CHK_notification_rules_severity',
  `"severity" IN ('info', 'warning', 'error')`,
)
@Check('CHK_notification_rules_revision', '"revision" >= 1')
export class NotificationRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'boolean', default: false })
  enabled: boolean;

  @Column({ type: 'integer', default: 1 })
  revision: number;

  @Column({ type: 'text' })
  scope: NotificationScope;

  @Column({ type: 'text' })
  trigger: NotificationTrigger;

  @DatabaseJsonColumn({ defaultEmptyObject: true })
  conditions: NotificationRuleConditions;

  @Column({ type: 'text' })
  repeat: NotificationRepeat;

  @Column({ type: 'text' })
  messageTemplate: string;

  @Column({ type: 'text' })
  severity: NotificationSeverity;

  @Column({
    type: getDatabaseKind() === 'postgres' ? 'timestamptz' : 'datetime',
  })
  activatedAt: Date;
}
