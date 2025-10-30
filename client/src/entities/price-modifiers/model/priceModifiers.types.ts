import type { ProductTemplate } from '@entities/product';

export const CONDITION_SOURCE = {
  ORDER: 'order',
  ITEM: 'item',
} as const;

export const CONDITION_OPERATOR = {
  EQ: 'eq', // Равно
  GT: 'gt', // Больше
  LT: 'lt', // Меньше
  GTE: 'gte', // Больше или равно
  LTE: 'lte', // Меньше или равно
} as const;

export const MODIFER_TYPE = {
  PERCENTAGE: 'percentage',
  FIXED_AMOUNT: 'fixed_amount',
} as const;

export type ConditionSource =
  (typeof CONDITION_SOURCE)[keyof typeof CONDITION_SOURCE];

export type ConditionOperator =
  (typeof CONDITION_OPERATOR)[keyof typeof CONDITION_OPERATOR];

export type ModifierType = (typeof MODIFER_TYPE)[keyof typeof MODIFER_TYPE];

export type Path = (string | number)[];

export type LeafCondition =
  | {
      source: typeof CONDITION_SOURCE.ORDER;
      path: string;
      operator: ConditionOperator;
      value: string | number;
    }
  | {
      source: typeof CONDITION_SOURCE.ITEM;
      path: string;
      operator: ConditionOperator;
      value: string | number;
    };

export type ConditionGroup = {
  AND?: PriceModifierCondition[];
  OR?: PriceModifierCondition[];
};

export type PriceModifierCondition = ConditionGroup | LeafCondition;

export type PriceModifier = {
  id: string;
  name: string;
  type: ModifierType;
  value: number;
  conditions: PriceModifierCondition;
  productTemplates: ProductTemplate[];

  createdAt: Date;
  updatedAt: Date;
};
