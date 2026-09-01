import { describe, expect, it } from 'vitest';

import type { Order } from '@entities/order';

import { buildCustomerOrderRows } from './customer-order';

describe('buildCustomerOrderRows', () => {
  it('builds printable rows from items of all documents', () => {
    const order = {
      id: 'order-1',
      characteristics: { material: { name: 'Дуб' } },
      items: [
        {
          id: 'item-1',
          template: {
            displayTemplate:
              '{{ item.height }}×{{ item.width }}, {{ material.name }}',
          },
          snapshot: { name: 'Фасад', customerPricingMethod: 'area' },
          characteristics: {
            width: 600,
            height: 720,
            thickness: 20,
            comment: 'Срочно',
          },
          quantity: 2,
          calculatedCustomerPrice: 7344,
        },
      ],
    } as Order;

    expect(buildCustomerOrderRows(order)).toEqual([
      {
        key: 'item-1',
        name: 'Фасад',
        dimensions: '720×600, Дуб',
        calculatedQuantity: 0.864,
        unit: 'м²',
        unitPrice: 8500,
        totalPrice: 7344,
        comment: 'Срочно',
      },
    ]);
  });
});
