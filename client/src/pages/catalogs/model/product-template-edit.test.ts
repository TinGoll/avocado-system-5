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
      operations: [
        {
          id: 'operation-1',
          name: 'Шлифовка',
          calculationMethod: 'per_item',
          calculationFormula: 'item.quantity',
          displayNameTemplate: 'Шлифовка',
          costPerUnit: 100,
          createdAt: new Date('2026-08-25T00:00:00.000Z'),
          updatedAt: new Date('2026-08-25T00:00:00.000Z'),
        },
      ],
    } as ProductTemplate;

    const values = getProductTemplateEditValues(product);

    expect(values.additionalCharacteristics).toEqual([
      { key: 'finish', value: 'матовый' },
    ]);
    expect(values.operationIds).toEqual(['operation-1']);
    expect(normalizeProductTemplateEditValues(values)).toEqual({
      name: 'Фасад глухой',
      group: 'Фасады',
      displayTemplate: null,
      defaultCharacteristics: {
        width: 600,
        height: 720,
        thickness: 21,
        finish: 'матовый',
      },
      attributes: { color: 'белый', available: true },
      customerPricingMethod: CUSTOMER_PRICING_METHOD.AREA,
      baseCustomerPrice: 5000,
      operationIds: ['operation-1'],
    });
  });
});
