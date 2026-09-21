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
const overlapsAny = (actual: string[], expected?: string[]) =>
  !expected?.length || actual.some((value) => expected.includes(value));

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
  const customStatuses =
    context.scope === 'group'
      ? (context.orderCustomStatusIds ??
        (context.orderCustomStatusId ? [context.orderCustomStatusId] : []))
      : (context.documentCustomStatusIds ??
        (context.documentCustomStatusId
          ? [context.documentCustomStatusId]
          : []));
  if (!overlapsAny(customStatuses, conditions.customStatusIn)) return false;
  if (
    conditions.customStatusNotIn?.length &&
    customStatuses.some((status) =>
      conditions.customStatusNotIn?.includes(status),
    )
  )
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
      overlapsAny(
        (before.customStatusIds as string[] | undefined) ??
          (before.customStatusId ? [before.customStatusId as string] : []),
        conditions.fromCustomStatusIn,
      ) &&
      overlapsAny(
        (after.customStatusIds as string[] | undefined) ??
          (after.customStatusId ? [after.customStatusId as string] : []),
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
