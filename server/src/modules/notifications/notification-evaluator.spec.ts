import { OrderStatus } from '../order-groups/entities/order-group.entity';
import { NotificationRule } from './entities/notification-rule.entity';
import { evaluateNotificationRule } from './notification-evaluator';
import type { NotificationEvaluationContext } from './notification-rule.types';

const context = (overrides: Partial<NotificationEvaluationContext> = {}) => ({
  scope: 'group' as const,
  orderGroupId: 1,
  orderNumber: 'A-1',
  orderStatus: OrderStatus.IN_PRODUCTION,
  orderDueDate: '2026-09-12',
  orderCustomStatusId: null,
  ...overrides,
});

const rule = (overrides: Partial<NotificationRule> = {}) =>
  Object.assign(new NotificationRule(), {
    enabled: true,
    scope: 'group',
    trigger: 'due_soon',
    conditions: { days: 2 },
    repeat: 'once',
    ...overrides,
  });

describe('evaluateNotificationRule', () => {
  it('uses inclusive local calendar boundaries', () => {
    expect(
      evaluateNotificationRule(
        rule(),
        context(),
        new Date('2026-09-09T21:00:00.000Z'),
        'Europe/Moscow',
      ),
    ).toBe(true);
    expect(
      evaluateNotificationRule(
        rule(),
        context(),
        new Date('2026-09-12T21:00:00.000Z'),
        'Europe/Moscow',
      ),
    ).toBe(false);
  });

  it('inherits group due date and excludes terminal and done documents', () => {
    const documentRule = rule({ scope: 'document' });
    expect(
      evaluateNotificationRule(
        documentRule,
        context({ scope: 'document', documentDueDate: null }),
        new Date('2026-09-10T10:00:00.000Z'),
        'Europe/Moscow',
      ),
    ).toBe(true);
    expect(
      evaluateNotificationRule(
        documentRule,
        context({ scope: 'document', stageKind: 'done' }),
        new Date('2026-09-10T10:00:00.000Z'),
        'Europe/Moscow',
      ),
    ).toBe(false);
    expect(
      evaluateNotificationRule(
        rule(),
        context({ orderStatus: OrderStatus.COMPLETED }),
        new Date('2026-09-10T10:00:00.000Z'),
        'Europe/Moscow',
      ),
    ).toBe(false);
  });

  it('matches a new stage entry independently from previous entries', () => {
    const stalled = rule({
      scope: 'document',
      trigger: 'stage_stalled',
      conditions: { days: 2 },
    });
    expect(
      evaluateNotificationRule(
        stalled,
        context({
          scope: 'document',
          enteredStageAt: new Date('2026-09-08T20:00:00.000Z'),
        }),
        new Date('2026-09-10T20:00:00.000Z'),
        'Europe/Moscow',
      ),
    ).toBe(true);
    expect(
      evaluateNotificationRule(
        stalled,
        context({
          scope: 'document',
          enteredStageAt: new Date('2026-09-10T20:00:00.000Z'),
        }),
        new Date('2026-09-10T20:00:00.000Z'),
        'Europe/Moscow',
      ),
    ).toBe(false);
  });

  it('applies typed event filters', () => {
    expect(
      evaluateNotificationRule(
        rule({
          trigger: 'lifecycle_changed',
          conditions: { toSystemStatusIn: [OrderStatus.COMPLETED] },
        }),
        context({
          eventType: 'lifecycle_changed',
          eventBefore: { status: OrderStatus.IN_PRODUCTION },
          eventAfter: { status: OrderStatus.COMPLETED },
        }),
        new Date(),
        'UTC',
      ),
    ).toBe(true);
  });

  it.each([
    [
      'stage_changed',
      { fromStageIn: ['old'], toStageIn: ['new'] },
      { stageId: 'old' },
      { stageId: 'new' },
    ],
    [
      'custom_status_changed',
      { fromCustomStatusIn: ['old'], toCustomStatusIn: ['new'] },
      { customStatusId: 'old' },
      { customStatusId: 'new' },
    ],
  ] as const)(
    'matches %s transitions',
    (trigger, conditions, before, after) => {
      expect(
        evaluateNotificationRule(
          rule({ trigger, conditions }),
          context({
            eventType: trigger,
            eventBefore: before,
            eventAfter: after,
          }),
          new Date(),
          'UTC',
        ),
      ).toBe(true);
    },
  );

  it('matches overdue dates only after the local due date', () => {
    expect(
      evaluateNotificationRule(
        rule({ trigger: 'overdue', conditions: {} }),
        context(),
        new Date('2026-09-12T21:00:00.000Z'),
        'Europe/Moscow',
      ),
    ).toBe(true);
  });
});
