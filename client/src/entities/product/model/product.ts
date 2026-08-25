import type { ProductTemplate } from '@shared/lib/swr';

export type {
  CustomerPricingMethod,
  ProductCharacteristics,
  ProductTemplate,
} from '@shared/lib/swr';
export { CUSTOMER_PRICING_METHOD } from '@shared/lib/swr';

export type CreateProductTemplateDto = Omit<
  ProductTemplate,
  'id' | 'operations'
> & {
  operationIds?: string[];
  priceModifierIds?: string[];
};
