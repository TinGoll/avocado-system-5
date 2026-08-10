import { ConditionSource } from '../entities/price-modifier.entity';

export type ConditionPathField =
  | 'string'
  | 'number'
  | { _type: 'enum'; options: readonly string[] };

export type ConditionPathSchema = {
  readonly [key: string]: ConditionPathField | ConditionPathSchema;
};

export type PriceModifierConditionPathSchemas = Record<
  ConditionSource,
  ConditionPathSchema
>;

// This response contract is also the allowlist used by DTO validation. Fields
// produced by pricing are intentionally absent, so a modifier cannot depend on
// the result of the calculation it participates in.
export const PRICE_MODIFIER_CONDITION_PATH_SCHEMAS = {
  [ConditionSource.ORDER_GROUP]: {
    id: 'number',
    orderNumber: 'string',
    customer: {
      name: 'string',
      level: {
        _type: 'enum',
        options: ['bronze', 'silver', 'gold'],
      },
    },
    status: {
      _type: 'enum',
      options: ['draft', 'in_production', 'completed', 'cancelled'],
    },
  },
  [ConditionSource.ORDER]: {
    characteristics: {
      color: {
        name: 'string',
        type: {
          _type: 'enum',
          options: ['stain', 'enamel'],
        },
      },
      material: {
        name: 'string',
        type: {
          _type: 'enum',
          options: ['softwood', 'hardwood', 'mdf'],
        },
      },
      patina: { name: 'string' },
      panel: {
        name: 'string',
        characteristics: { style: 'string' },
      },
      varnish: { name: 'string' },
      profile: {
        name: 'string',
        characteristics: {
          width: 'number',
          grooveDepth: 'number',
          grooveWidth: 'number',
          style: 'string',
        },
      },
    },
  },
  [ConditionSource.ITEM]: {
    template: {
      name: 'string',
      defaultCharacteristics: {
        width: 'number',
        height: 'number',
        thickness: 'number',
      },
      customerPricingMethod: {
        _type: 'enum',
        options: ['per_item', 'linear_meter', 'area', 'volume'],
      },
      baseCustomerPrice: 'number',
      group: 'string',
    },
    quantity: 'number',
    snapshot: {
      name: 'string',
      baseCustomerPrice: 'number',
      customerPricingMethod: {
        _type: 'enum',
        options: ['per_item', 'linear_meter', 'area', 'volume'],
      },
      defaultCharacteristics: {
        width: 'number',
        height: 'number',
        thickness: 'number',
      },
    },
    characteristics: {
      width: 'number',
      height: 'number',
      thickness: 'number',
    },
  },
} as const satisfies PriceModifierConditionPathSchemas;

const isConditionPathField = (
  value: ConditionPathField | ConditionPathSchema,
): value is ConditionPathField =>
  typeof value === 'string' || Object.hasOwn(value, '_type');

export const isAllowedPriceModifierConditionPath = (
  source: ConditionSource,
  path: string,
): boolean => {
  const parts = path.split('.');
  let current: ConditionPathField | ConditionPathSchema =
    PRICE_MODIFIER_CONDITION_PATH_SCHEMAS[source];

  for (const part of parts) {
    if (isConditionPathField(current) || !Object.hasOwn(current, part)) {
      return false;
    }
    current = current[part];
  }

  return isConditionPathField(current);
};
