import { OrderStatus } from '../order-groups/entities/order-group.entity';
import type { NotificationRule } from './entities/notification-rule.entity';
import type { NotificationEvaluationContext } from './notification-rule.types';

const localDate = (value: Date, timeZone: string): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};

const addDays = (date: string, days: number): string => {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const overlaps = (actual: string | undefined, expected?: string[]) =>
  !expected?.length || (!!actual && expected.includes(actual));

export function evaluateNotificationRule(
  rule: NotificationRule,
  context: NotificationEvaluationContext,
  now: Date,
  timeZone: string,
): boolean {
  if (!rule.enabled || rule.scope !== context.scope) return false;
  const conditions = rule.conditions;
  if (
    conditions.systemStatusIn?.length &&
    !conditions.systemStatusIn.includes(context.orderStatus)
  )
    return false;
  const customStatus =
    context.scope === 'group'
      ? context.orderCustomStatusId
      : context.documentCustomStatusId;
  if (!overlaps(customStatus ?? undefined, conditions.customStatusIn))
    return false;
  if (customStatus && conditions.customStatusNotIn?.includes(customStatus))
    return false;
  if (!overlaps(context.boardId, conditions.boardIn)) return false;
  if (!overlaps(context.stageId, conditions.stageIn)) return false;

  if (['due_soon', 'overdue', 'stage_stalled'].includes(rule.trigger)) {
    if (
      [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(
        context.orderStatus,
      )
    )
      return false;
    if (context.scope === 'document' && context.stageKind === 'done')
      return false;
  }
  const today = localDate(now, timeZone);
  if (rule.trigger === 'due_soon' || rule.trigger === 'overdue') {
    const dueDate =
      context.scope === 'document'
        ? context.documentDueDate || context.orderDueDate
        : context.orderDueDate;
    if (!dueDate) return false;
    return rule.trigger === 'overdue'
      ? dueDate < today
      : today >= addDays(dueDate, -(conditions.days ?? 0)) && today <= dueDate;
  }
  if (rule.trigger === 'stage_stalled') {
    if (context.scope !== 'document' || !context.enteredStageAt) return false;
    return (
      today >=
      addDays(localDate(context.enteredStageAt, timeZone), conditions.days ?? 0)
    );
  }
  if (context.eventType !== rule.trigger) return false;
  const before = context.eventBefore ?? {};
  const after = context.eventAfter ?? {};
  if (rule.trigger === 'stage_changed')
    return (
      overlaps(before.stageId as string | undefined, conditions.fromStageIn) &&
      overlaps(after.stageId as string | undefined, conditions.toStageIn)
    );
  if (rule.trigger === 'custom_status_changed')
    return (
      overlaps(
        before.customStatusId as string | undefined,
        conditions.fromCustomStatusIn,
      ) &&
      overlaps(
        after.customStatusId as string | undefined,
        conditions.toCustomStatusIn,
      )
    );
  return (
    overlaps(
      before.status as string | undefined,
      conditions.fromSystemStatusIn,
    ) &&
    overlaps(after.status as string | undefined, conditions.toSystemStatusIn)
  );
}
