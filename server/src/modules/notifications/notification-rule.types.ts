import type { OrderStatus } from '../order-groups/entities/order-group.entity';
import type { NotificationScope } from './entities/notification-rule.entity';

export interface NotificationRuleConditions {
  days?: number;
  systemStatusIn?: OrderStatus[];
  customStatusIn?: string[];
  customStatusNotIn?: string[];
  boardIn?: string[];
  stageIn?: string[];
  fromStageIn?: string[];
  toStageIn?: string[];
  fromCustomStatusIn?: string[];
  toCustomStatusIn?: string[];
  fromSystemStatusIn?: OrderStatus[];
  toSystemStatusIn?: OrderStatus[];
}

export interface NotificationEvaluationContext {
  scope: NotificationScope;
  orderGroupId: number;
  orderNumber: string;
  orderStatus: OrderStatus;
  orderDueDate: string | null;
  orderCustomStatusId: string | null;
  documentId?: string;
  documentNumber?: number;
  documentName?: string | null;
  documentDueDate?: string | null;
  documentCustomStatusId?: string | null;
  cardId?: string;
  boardId?: string;
  stageId?: string;
  stageName?: string;
  stageKind?: 'queue' | 'active' | 'done';
  enteredStageAt?: Date;
  eventType?: string;
  eventBefore?: Record<string, unknown>;
  eventAfter?: Record<string, unknown>;
}

export type NotificationLinkTarget =
  | { type: 'order'; orderGroupId: number }
  | { type: 'document'; orderGroupId: number; documentId: string };

export type RenderedMessagePart =
  | { type: 'text'; text: string }
  | { type: 'link'; label: string; target: NotificationLinkTarget };
