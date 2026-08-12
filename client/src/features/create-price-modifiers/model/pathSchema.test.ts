import { CONDITION_OPERATOR } from '@entities/price-modifiers';

import type { PriceModifierConditionPathSchemas } from './pathSchema';
import {
  getAllowedOperators,
  getFieldTypeFromPath,
  getSelectablePaths,
  getValueEditorType,
} from './pathSchema';

const serverContract = {
  order_group: {
    status: {
      label: 'Статус заказа',
      type: 'enum',
      options: ['draft', 'completed'],
    },
  },
  order: {
    characteristics: {
      label: 'Параметры документа',
      children: {
        material: {
          label: 'Материал',
          children: { name: { label: 'Название', type: 'string' } },
        },
      },
    },
  },
  item: {
    quantity: { label: 'Количество', type: 'number' },
    snapshot: {
      label: 'Снимок',
      children: {
        baseCustomerPrice: { label: 'Базовая цена', type: 'number' },
      },
    },
  },
} as const satisfies PriceModifierConditionPathSchemas;

describe('price modifier condition path schema', () => {
  it('offers exactly the leaf paths supplied by the server', () => {
    expect(getSelectablePaths(serverContract.order)).toEqual([
      'characteristics.material.name',
    ]);
    expect(getSelectablePaths(serverContract.item)).toEqual([
      'quantity',
      'snapshot.baseCustomerPrice',
    ]);
  });

  it.each([
    ['order', 'totalPrice'],
    ['item', 'calculatedCustomerPrice'],
    ['item', 'quantity.value'],
  ] as const)('does not resolve forbidden path %s.%s', (source, path) => {
    expect(getFieldTypeFromPath(serverContract[source], path)).toBeUndefined();
  });

  it.each([
    ['item', 'quantity', 'number'],
    ['order', 'characteristics.material.name', 'string'],
    ['order_group', 'status', 'enum'],
  ] as const)(
    'selects the %s.%s editor from the server field type',
    (source, path, editor) => {
      const field = getFieldTypeFromPath(serverContract[source], path);
      expect(getValueEditorType(field)).toBe(editor);
    },
  );

  it('allows ordering operators only for number fields', () => {
    const numberField = getFieldTypeFromPath(serverContract.item, 'quantity');
    const stringField = getFieldTypeFromPath(
      serverContract.order,
      'characteristics.material.name',
    );
    const enumField = getFieldTypeFromPath(
      serverContract.order_group,
      'status',
    );

    expect(getAllowedOperators(numberField)).toEqual([
      CONDITION_OPERATOR.EQ,
      CONDITION_OPERATOR.GT,
      CONDITION_OPERATOR.LT,
      CONDITION_OPERATOR.GTE,
      CONDITION_OPERATOR.LTE,
    ]);
    expect(getAllowedOperators(stringField)).toEqual([CONDITION_OPERATOR.EQ]);
    expect(getAllowedOperators(enumField)).toEqual([CONDITION_OPERATOR.EQ]);
  });
});
