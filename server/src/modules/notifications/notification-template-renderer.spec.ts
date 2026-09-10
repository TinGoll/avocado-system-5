import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../order-groups/entities/order-group.entity';
import {
  renderNotificationTemplate,
  validateMessageTemplate,
} from './notification-template-renderer';

describe('notification template renderer', () => {
  it('renders text and structured links', () => {
    expect(
      renderNotificationTemplate('Заказ {{order.link}}: {{dueDate}}', {
        scope: 'group',
        orderGroupId: 12,
        orderNumber: 'A-12',
        orderStatus: OrderStatus.IN_PRODUCTION,
        orderDueDate: '2026-09-12',
        orderCustomStatusId: null,
      }),
    ).toEqual([
      { type: 'text', text: 'Заказ ' },
      {
        type: 'link',
        label: 'A-12',
        target: { type: 'order', orderGroupId: 12 },
      },
      { type: 'text', text: ': ' },
      { type: 'text', text: '2026-09-12' },
    ]);
  });

  it('rejects cross-scope variables, HTML and URLs', () => {
    expect(() =>
      validateMessageTemplate('{{document.number}}', 'group'),
    ).toThrow(BadRequestException);
    expect(() => validateMessageTemplate('<b>hello</b>', 'group')).toThrow(
      BadRequestException,
    );
    expect(() =>
      validateMessageTemplate('https://example.com', 'group'),
    ).toThrow(BadRequestException);
  });
});
