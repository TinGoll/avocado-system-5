export const CUSTOMER_PRICING_METHOD = {
  PER_ITEM: 'per_item',
  AREA: 'area',
  VOLUME: 'volume',
} as const;

export type CustomerPricingMethod =
  (typeof CUSTOMER_PRICING_METHOD)[keyof typeof CUSTOMER_PRICING_METHOD];

type ProductCharacteristics = {
  width?: number;
  height?: number;
  thickness?: number;
};

export type ProductTemplate = {
  id: string;
  name: string;
  defaultCharacteristics: ProductCharacteristics;
  customerPricingMethod: CustomerPricingMethod;
  baseCustomerPrice: number;
  attributes: object;
  group?: string;
  //   operations: ProductionOperation[];
  //   priceModifiers: PriceModifier[];
};
