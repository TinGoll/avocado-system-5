import { describe, expect, it } from 'vitest';

import {
  normalizeNotificationRule,
  unsupportedTemplateVariables,
  type NotificationRuleValues,
} from './notification-rule';

const values: NotificationRuleValues = {
  name: 'За 2 дня',
  enabled: false,
  scope: 'group',
  trigger: 'due_soon',
  conditions: { days: 2, boardIn: ['old'], fromStageIn: ['old'] },
  repeat: 'daily',
  messageTemplate: '{{order.link}} — {{dueDate}}',
  severity: 'warning',
};

describe('notification rule form', () => {
  it('removes hidden incompatible condition values', () => {
    expect(normalizeNotificationRule(values).conditions).toEqual({ days: 2 });
  });

  it('forces event rules to once', () => {
    expect(
      normalizeNotificationRule({
        ...values,
        trigger: 'custom_status_changed',
      }).repeat,
    ).toBe('once');
  });

  it('reports variables unavailable for the selected scope', () => {
    expect(
      unsupportedTemplateVariables(
        '{{order.link}} {{document.link}} {{unknown.value}}',
        'group',
      ),
    ).toEqual(['document.link', 'unknown.value']);
  });
});
