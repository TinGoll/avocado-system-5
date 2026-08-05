import type {
  CustomerPricingMethod,
  ProductCharacteristics,
} from '@entities/product';

export type ProductTemplateFieldType = {
  name: string;
  group?: string;
  defaultCharacteristics: ProductCharacteristics;
  customerPricingMethod: CustomerPricingMethod;
  baseCustomerPrice: number;
};
