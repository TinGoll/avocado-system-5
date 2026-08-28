import { describe, expect, it } from 'vitest';

import { mergeProductionOperationVariables } from './template-variable-metadata';

describe('mergeProductionOperationVariables', () => {
  const quantity = {
    path: 'item.quantity',
    label: 'Количество',
    description: 'Количество позиций заказа',
    valueType: 'number' as const,
    unit: 'шт.',
  };
  const name = {
    path: 'item.name',
    label: 'Название продукта',
    description: 'Название продукта в позиции заказа',
    valueType: 'string' as const,
    optional: true,
  };

  it('keeps name-scope order and marks availability', () => {
    expect(
      mergeProductionOperationVariables([quantity], [quantity, name]),
    ).toEqual([
      { ...quantity, availability: 'formula-and-name' },
      { ...name, availability: 'name-only' },
    ]);
  });
});
