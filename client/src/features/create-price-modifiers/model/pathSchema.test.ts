import type { PriceModifierConditionPathSchemas } from './pathSchema';
import { getFieldTypeFromPath, getSelectablePaths } from './pathSchema';

const serverContract = {
  order_group: {
    status: { _type: 'enum', options: ['draft', 'completed'] },
  },
  order: {
    characteristics: {
      material: { name: 'string' },
    },
  },
  item: {
    quantity: 'number',
    snapshot: { baseCustomerPrice: 'number' },
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
    ['item', 'calculatedProductionCost'],
  ] as const)(
    'does not resolve a path absent from %s schema',
    (source, path) => {
      expect(
        getFieldTypeFromPath(serverContract[source], path),
      ).toBeUndefined();
    },
  );

  it('keeps ordinary fields selectable with their server-defined type', () => {
    expect(getFieldTypeFromPath(serverContract.item, 'quantity')).toBe(
      'number',
    );
    expect(getFieldTypeFromPath(serverContract.order_group, 'status')).toEqual({
      _type: 'enum',
      options: ['draft', 'completed'],
    });
  });
});
