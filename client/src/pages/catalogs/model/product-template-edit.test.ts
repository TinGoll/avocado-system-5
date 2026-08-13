import { describe, expect, it } from 'vitest';

import {
  CUSTOMER_PRICING_METHOD,
  type ProductTemplate,
} from '@entities/product';

import {
  getProductTemplateEditValues,
  normalizeProductTemplateEditValues,
} from './product-template-edit';

describe('ProductTemplateEditForm value conversion', () => {
  it('keeps dimensions and arbitrary JSON fields when editing', () => {
    const product = {
      id: 'product-1',
      name: '  Фасад глухой  ',
      group: '  Фасады  ',
      defaultCharacteristics: {
        width: 600,
        height: 720,
        thickness: 21,
        finish: 'матовый',
      },
      attributes: { color: 'белый', available: true },
      customerPricingMethod: CUSTOMER_PRICING_METHOD.AREA,
      baseCustomerPrice: 5000,
    } as ProductTemplate;

    const values = getProductTemplateEditValues(product);

    expect(values.additionalCharacteristics).toEqual([
      { key: 'finish', value: 'матовый' },
    ]);
    expect(normalizeProductTemplateEditValues(values)).toEqual({
      name: 'Фасад глухой',
      group: 'Фасады',
      defaultCharacteristics: {
        width: 600,
        height: 720,
        thickness: 21,
        finish: 'матовый',
      },
      attributes: { color: 'белый', available: true },
      customerPricingMethod: CUSTOMER_PRICING_METHOD.AREA,
      baseCustomerPrice: 5000,
    });
  });
});
