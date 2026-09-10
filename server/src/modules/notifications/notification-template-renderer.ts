import { BadRequestException } from '@nestjs/common';
import type {
  NotificationEvaluationContext,
  RenderedMessagePart,
} from './notification-rule.types';

const tokens = /{{\s*([a-z]+\.[a-z]+|dueDate)\s*}}/g;
const allowed = {
  group: new Set(['order.number', 'order.link', 'dueDate']),
  document: new Set([
    'order.number',
    'order.link',
    'document.number',
    'document.name',
    'document.link',
    'stage.name',
    'dueDate',
  ]),
};

export function validateMessageTemplate(
  template: string,
  scope: 'group' | 'document',
) {
  if (/<[^>]*>|(?:javascript|https?):\/\//i.test(template))
    throw new BadRequestException(
      'HTML, JavaScript and URLs are not supported',
    );
  const braces = template.match(/{{[^}]*}}/g) ?? [];
  const parsed = [...template.matchAll(tokens)];
  if (
    braces.length !== parsed.length ||
    parsed.some((match) => !allowed[scope].has(match[1]))
  )
    throw new BadRequestException(
      'Message template contains an unsupported variable',
    );
}

export function renderNotificationTemplate(
  template: string,
  context: NotificationEvaluationContext,
): RenderedMessagePart[] {
  validateMessageTemplate(template, context.scope);
  const values: Record<string, string> = {
    'order.number': context.orderNumber,
    'document.number': String(context.documentNumber ?? ''),
    'document.name': context.documentName ?? '',
    'stage.name': context.stageName ?? '',
    dueDate:
      (context.scope === 'document' ? context.documentDueDate : null) ||
      context.orderDueDate ||
      '',
  };
  const result: RenderedMessagePart[] = [];
  let offset = 0;
  for (const match of template.matchAll(tokens)) {
    if (match.index > offset)
      result.push({ type: 'text', text: template.slice(offset, match.index) });
    if (match[1] === 'order.link')
      result.push({
        type: 'link',
        label: context.orderNumber,
        target: { type: 'order', orderGroupId: context.orderGroupId },
      });
    else if (match[1] === 'document.link') {
      if (!context.documentId)
        throw new BadRequestException(
          'Document link requires a document target',
        );
      result.push({
        type: 'link',
        label: `Документ ${context.documentNumber}`,
        target: {
          type: 'document',
          orderGroupId: context.orderGroupId,
          documentId: context.documentId,
        },
      });
    } else result.push({ type: 'text', text: values[match[1]] ?? '' });
    offset = match.index + match[0].length;
  }
  if (offset < template.length)
    result.push({ type: 'text', text: template.slice(offset) });
  return result;
}
