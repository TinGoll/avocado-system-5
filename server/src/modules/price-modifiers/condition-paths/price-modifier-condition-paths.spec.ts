import {
  ConditionOperator,
  ConditionSource,
} from '../entities/price-modifier.entity';
import {
  getPriceModifierConditionPathField,
  isAllowedPriceModifierConditionPath,
  isConditionOperatorAllowedForField,
  isConditionPathField,
  isConditionValueValidForField,
  PRICE_MODIFIER_CONDITION_PATH_SCHEMAS,
  type ConditionPathSchema,
} from './price-modifier-condition-paths';

const collectPaths = (schema: ConditionPathSchema, prefix = ''): string[] =>
  Object.entries(schema).flatMap(([key, node]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return isConditionPathField(node)
      ? [path]
      : collectPaths(node.children, path);
  });

describe('price modifier condition path contract', () => {
  it.each(Object.values(ConditionSource))(
    'allows every path published to the client for %s',
    (source) => {
      const paths = collectPaths(PRICE_MODIFIER_CONDITION_PATH_SCHEMAS[source]);
      expect(paths.length).toBeGreaterThan(0);
      expect(
        paths.every((path) =>
          isAllowedPriceModifierConditionPath(source, path),
        ),
      ).toBe(true);
    },
  );

  it.each([
    [ConditionSource.ORDER_GROUP, 'orderCount'],
    [ConditionSource.ORDER, 'totalPrice'],
    [ConditionSource.ITEM, 'calculatedCustomerPrice'],
    [ConditionSource.ITEM, 'quantity.value'],
    [ConditionSource.ORDER, 'characteristics.material'],
  ])('rejects unknown or non-leaf path %s.%s', (source, path) => {
    expect(isAllowedPriceModifierConditionPath(source, path)).toBe(false);
  });

  it('validates number fields and comparison operators', () => {
    const field = getPriceModifierConditionPathField(
      ConditionSource.ITEM,
      'quantity',
    );
    expect(field).toBeDefined();
    expect(isConditionValueValidForField(field!, 2)).toBe(true);
    expect(isConditionValueValidForField(field!, '2')).toBe(false);
    expect(
      isConditionOperatorAllowedForField(field!, ConditionOperator.GTE),
    ).toBe(true);
  });

  it('validates string fields and equality only', () => {
    const field = getPriceModifierConditionPathField(
      ConditionSource.ORDER,
      'characteristics.material.name',
    );
    expect(field).toBeDefined();
    expect(isConditionValueValidForField(field!, 'oak')).toBe(true);
    expect(isConditionValueValidForField(field!, 1)).toBe(false);
    expect(
      isConditionOperatorAllowedForField(field!, ConditionOperator.GT),
    ).toBe(false);
  });

  it.each(['customer.address', 'customer.companyName'])(
    'allows customer field order_group.%s',
    (path) => {
      const field = getPriceModifierConditionPathField(
        ConditionSource.ORDER_GROUP,
        path,
      );

      expect(field).toEqual(expect.objectContaining({ type: 'string' }));
      expect(isConditionValueValidForField(field!, 'Авокадо')).toBe(true);
      expect(
        isConditionOperatorAllowedForField(field!, ConditionOperator.EQ),
      ).toBe(true);
    },
  );

  it('validates enum options and equality only', () => {
    const field = getPriceModifierConditionPathField(
      ConditionSource.ORDER_GROUP,
      'status',
    );
    expect(field).toBeDefined();
    expect(isConditionValueValidForField(field!, 'draft')).toBe(true);
    expect(isConditionValueValidForField(field!, 'unknown')).toBe(false);
    expect(
      isConditionOperatorAllowedForField(field!, ConditionOperator.LT),
    ).toBe(false);
  });

  it.each([
    ['characteristics.thermalSeam', 'Да'],
    ['characteristics.drilling', 'Нет'],
  ])('allows document option %s=%s', (path, value) => {
    const field = getPriceModifierConditionPathField(
      ConditionSource.ORDER,
      path,
    );
    expect(field).toEqual(
      expect.objectContaining({ type: 'enum', options: ['Да', 'Нет'] }),
    );
    expect(isConditionValueValidForField(field!, value)).toBe(true);
  });
});
