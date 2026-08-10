import type { ProductTemplate } from '@shared/lib/swr';

import type { PriceModifierInput } from '../model/priceModifiers.types';

import {
  toCreatePriceModifierDto,
  toUpdatePriceModifierDto,
} from './priceModifiers.api';

const template = (id: string) => ({ id }) as ProductTemplate;

const input: PriceModifierInput = {
  name: 'Срочный заказ',
  type: 'percentage',
  value: 15,
  priority: 2,
  conditions: {
    source: 'order_group',
    path: 'status',
    operator: 'eq',
    value: 'urgent',
  },
  productTemplates: [template('template-1'), template('template-2')],
};

describe('price modifier payload', () => {
  it('forms a server-compatible create payload', () => {
    expect(toCreatePriceModifierDto(input)).toEqual({
      name: 'Срочный заказ',
      type: 'percentage',
      value: 15,
      priority: 2,
      conditions: input.conditions,
      productTemplateIds: ['template-1', 'template-2'],
    });
  });

  it('forms a partial update payload and maps product templates', () => {
    expect(
      toUpdatePriceModifierDto({
        value: 20,
        productTemplates: [template('template-3')],
      }),
    ).toEqual({
      value: 20,
      productTemplateIds: ['template-3'],
    });

    expect(toUpdatePriceModifierDto({ name: 'Новое имя' })).toEqual({
      name: 'Новое имя',
    });

    expect(
      toUpdatePriceModifierDto({
        ...input,
        id: 'must-not-be-sent',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as PriceModifierInput),
    ).not.toHaveProperty('id');
  });
});
