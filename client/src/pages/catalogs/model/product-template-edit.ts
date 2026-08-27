import type { ProductTemplate } from '@entities/product';
import {
  dynamicFieldsToObject,
  objectToDynamicFields,
  type DynamicField,
} from '@shared/ui/dynamic-fields';

export type ProductTemplateEditValues = Omit<
  ProductTemplate,
  'id' | 'attributes' | 'defaultCharacteristics' | 'operations'
> & {
  defaultCharacteristics: ProductTemplate['defaultCharacteristics'];
  attributes: DynamicField[];
  additionalCharacteristics: DynamicField[];
  operationIds: string[];
  displayTemplatePreview?: Record<string, string>;
};

const dimensionKeys = new Set(['width', 'height', 'thickness']);

export const getProductTemplateEditValues = (
  product: ProductTemplate,
): ProductTemplateEditValues => ({
  name: product.name,
  displayTemplate: product.displayTemplate,
  group: product.group,
  customerPricingMethod: product.customerPricingMethod,
  baseCustomerPrice: product.baseCustomerPrice,
  operationIds: product.operations?.map(({ id }) => id) ?? [],
  defaultCharacteristics: {
    width: product.defaultCharacteristics.width,
    height: product.defaultCharacteristics.height,
    thickness: product.defaultCharacteristics.thickness,
  },
  additionalCharacteristics: objectToDynamicFields(
    Object.fromEntries(
      Object.entries(product.defaultCharacteristics).filter(
        ([key]) => !dimensionKeys.has(key),
      ),
    ),
  ),
  attributes: objectToDynamicFields(product.attributes),
});

export const normalizeProductTemplateEditValues = (
  values: ProductTemplateEditValues,
) => {
  const { additionalCharacteristics, attributes, ...product } = values;
  delete product.displayTemplatePreview;

  return {
    ...product,
    name: values.name.trim(),
    group: values.group?.trim() || undefined,
    displayTemplate: values.displayTemplate?.trim() || null,
    defaultCharacteristics: {
      ...values.defaultCharacteristics,
      ...dynamicFieldsToObject(additionalCharacteristics),
    },
    attributes: dynamicFieldsToObject(attributes),
  };
};
