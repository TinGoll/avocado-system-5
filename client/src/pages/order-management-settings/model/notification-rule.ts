import type { ManagementScope } from '@shared/api';

export type NotificationTrigger =
  | 'due_soon'
  | 'overdue'
  | 'stage_stalled'
  | 'stage_changed'
  | 'custom_status_changed'
  | 'lifecycle_changed';
export type NotificationRepeat = 'once' | 'daily';
export type NotificationSeverity = 'info' | 'warning' | 'error';
export type SystemStatus =
  | 'draft'
  | 'in_production'
  | 'completed'
  | 'cancelled';

export type NotificationConditions = {
  days?: number;
  systemStatusIn?: SystemStatus[];
  customStatusIn?: string[];
  customStatusNotIn?: string[];
  boardIn?: string[];
  stageIn?: string[];
  fromStageIn?: string[];
  toStageIn?: string[];
  fromCustomStatusIn?: string[];
  toCustomStatusIn?: string[];
  fromSystemStatusIn?: SystemStatus[];
  toSystemStatusIn?: SystemStatus[];
};

export type NotificationRuleValues = {
  name: string;
  enabled: boolean;
  scope: ManagementScope;
  trigger: NotificationTrigger;
  conditions: NotificationConditions;
  repeat: NotificationRepeat;
  messageTemplate: string;
  severity: NotificationSeverity;
};

export type NotificationRule = NotificationRuleValues & {
  id: string;
  revision: number;
  activatedAt: string;
};

const temporalTriggers = new Set<NotificationTrigger>([
  'due_soon',
  'overdue',
  'stage_stalled',
]);

export const allowedTemplateVariables = (scope: ManagementScope) =>
  scope === 'group'
    ? ['order.number', 'order.link', 'dueDate']
    : [
        'order.number',
        'order.link',
        'document.number',
        'document.name',
        'document.link',
        'stage.name',
        'dueDate',
      ];

export const unsupportedTemplateVariables = (
  template: string,
  scope: ManagementScope,
) => {
  const allowed = new Set(allowedTemplateVariables(scope));
  return [...template.matchAll(/{{\s*([^}]+?)\s*}}/g)]
    .map((match) => match[1])
    .filter((value): value is string => Boolean(value && !allowed.has(value)));
};

export const normalizeNotificationRule = (
  values: NotificationRuleValues,
): NotificationRuleValues => {
  const { conditions } = values;
  const normalized: NotificationConditions = {};
  const copy = <K extends keyof NotificationConditions>(key: K) => {
    const value = conditions?.[key];
    if (Array.isArray(value) ? value.length > 0 : value !== undefined)
      Object.assign(normalized, { [key]: value });
  };

  if (values.trigger === 'due_soon' || values.trigger === 'stage_stalled')
    copy('days');
  if (temporalTriggers.has(values.trigger)) {
    copy('customStatusIn');
    copy('customStatusNotIn');
    copy('systemStatusIn');
    if (values.scope === 'document') {
      copy('boardIn');
      copy('stageIn');
    }
  }
  if (values.trigger === 'stage_changed') {
    copy('boardIn');
    copy('fromStageIn');
    copy('toStageIn');
  }
  if (values.trigger === 'custom_status_changed') {
    copy('fromCustomStatusIn');
    copy('toCustomStatusIn');
  }
  if (values.trigger === 'lifecycle_changed') {
    copy('fromSystemStatusIn');
    copy('toSystemStatusIn');
  }

  return {
    ...values,
    repeat: temporalTriggers.has(values.trigger) ? values.repeat : 'once',
    conditions: normalized,
  };
};
