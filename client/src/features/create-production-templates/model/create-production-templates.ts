import type {
  CustomerPricingMethod,
  ProductCharacteristics,
} from '@entities/product';
import type { DynamicField } from '@shared/ui/dynamic-fields';

export type ProductTemplateFieldType = {
  name: string;
  displayTemplate?: string | null;
  displayTemplatePreview?: {
    width?: number;
    height?: number;
    thickness?: number;
    material?: string;
    color?: string;
    patina?: string;
    profile?: string;
    panel?: string;
    varnish?: string;
  };
  group?: string;
  defaultCharacteristics: ProductCharacteristics;
  customerPricingMethod: CustomerPricingMethod;
  baseCustomerPrice: number;
  attributes: DynamicField[];
  additionalCharacteristics: DynamicField[];
  operationIds: string[];
  priceModifierIds: string[];
};
