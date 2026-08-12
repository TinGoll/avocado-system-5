import type {
  CustomerPricingMethod,
  ProductCharacteristics,
} from '@entities/product';
import type { DynamicField } from '@shared/ui/dynamic-fields';

export type ProductTemplateFieldType = {
  name: string;
  group?: string;
  defaultCharacteristics: ProductCharacteristics;
  customerPricingMethod: CustomerPricingMethod;
  baseCustomerPrice: number;
  attributes: DynamicField[];
  additionalCharacteristics: DynamicField[];
  priceModifierIds: string[];
};
