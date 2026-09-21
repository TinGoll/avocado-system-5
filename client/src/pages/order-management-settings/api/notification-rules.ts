import type { NotificationMessagePart } from '@entities/notification';
import { fetcher } from '@shared/lib/swr';

import type {
  NotificationRule,
  NotificationRuleValues,
} from '../model/notification-rule';

export type NotificationPreviewItem = {
  target:
    | { type: 'order'; orderGroupId: number }
    | { type: 'document'; orderGroupId: number; documentId: string };
  message: NotificationMessagePart[];
  possibleRepeat: boolean;
};

export type NotificationSchedulerState = {
  enabled: boolean;
  running: boolean;
  lastStartedAt: string | null;
  lastSucceededAt: string | null;
  lastError: string | null;
  lastCreatedCount: number;
  lastProcessedEventCount: number;
};

export const notificationRuleKeys = {
  list: 'notifications/rules',
  scheduler: 'notifications/scheduler/status',
};

export const getNotificationRules = () =>
  fetcher<{ items: NotificationRule[]; meta: { count: number } }>({
    url: notificationRuleKeys.list,
  });

export const createNotificationRule = (data: NotificationRuleValues) =>
  fetcher<NotificationRule, NotificationRuleValues>({
    url: notificationRuleKeys.list,
    method: 'POST',
    data,
  });

export const updateNotificationRule = (
  rule: NotificationRule,
  data: NotificationRuleValues,
) =>
  fetcher<
    NotificationRule,
    NotificationRuleValues & { expectedRevision: number }
  >({
    url: `${notificationRuleKeys.list}/${rule.id}`,
    method: 'PATCH',
    data: { ...data, expectedRevision: rule.revision },
  });

export const previewNotificationRule = (
  data: NotificationRuleValues & {
    orderGroupId?: number;
    orderId?: string;
    limit: number;
  },
) =>
  fetcher<{
    items: NotificationPreviewItem[];
    meta: { count: number; limit: number };
  }>({ url: `${notificationRuleKeys.list}/preview`, method: 'POST', data });
