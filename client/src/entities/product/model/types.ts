export const CUSTOMER_PRICING_METHOD = {
  PER_ITEM: 'per_item',
  AREA: 'area',
  VOLUME: 'volume',
} as const;

export type CustomerPricingMethod =
  (typeof CUSTOMER_PRICING_METHOD)[keyof typeof CUSTOMER_PRICING_METHOD];

export type ProductTemplate = {
  id: string;
  name: string;
  defaultCharacteristics: Record<string, string | number | boolean>;
  customerPricingMethod: CustomerPricingMethod;
  baseCustomerPrice: number;
  attributes: object;
  group?: string;
  //   operations: ProductionOperation[];
  //   priceModifiers: PriceModifier[];
  createdAt: Date;
  updatedAt: Date;
};
