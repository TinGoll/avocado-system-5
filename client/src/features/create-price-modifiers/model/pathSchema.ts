import { COLOR_TYPE } from '@entities/color';
import { MATERIAL_TYPE } from '@entities/material';
import { ORDER_STATUS } from '@entities/order';
import { CUSTOMER_PRICING_METHOD } from '@entities/product';

export type SchemaField =
  | 'string'
  | 'number'
  | { _type: 'enum'; options: readonly string[] };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createSchema = <T extends Record<string, any>>(schema: T): T => schema;

export const getFieldTypeFromPath = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: Record<string, any>,
  path: string,
): SchemaField | undefined => {
  if (!path) return undefined;
  const parts = path.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = schema;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isSchemaLeaf = (field: any): field is SchemaField => {
  if (typeof field === 'string') {
    return true;
  }
  if (typeof field === 'object' && field !== null && '_type' in field) {
    return true;
  }
  return false;
};

export const orderGroupSchema = createSchema({
  id: 'number',
  orderNumber: 'string',
  customer: {
    name: 'string',
    level: { _type: 'enum', options: ['bronze', 'silver', 'gold'] as const },
  },
  status: {
    _type: 'enum',
    options: Object.values(ORDER_STATUS),
  },
  orderCount: 'number',
});

export const orderSchema = createSchema({
  characteristics: {
    color: {
      name: 'string',
      type: {
        _type: 'enum',
        options: Object.values(COLOR_TYPE),
      },
    },
    material: {
      name: 'string',
      type: {
        _type: 'enum',
        options: Object.values(MATERIAL_TYPE),
      },
    },
    patina: {
      name: 'string',
    },
    panel: {
      name: 'string',
      characteristics: {
        style: 'string',
      },
    },
    varnish: {
      name: 'string',
    },
    profile: {
      name: 'string',
      characteristics: {
        width: 'number',
        grooveDepth: 'number',
        grooveWidth: 'number',
        style: 'string',
      },
    },
  },
  totalPrice: 'number',
});

export const itemSchema = createSchema({
  template: {
    name: 'string',
    defaultCharacteristics: {
      width: 'number',
      height: 'number',
      thickness: 'number',
    },
    customerPricingMethod: {
      _type: 'enum',
      options: Object.values(CUSTOMER_PRICING_METHOD),
    },
    baseCustomerPrice: 'number',
    group: 'string',
  },
  quantity: 'number',
  snapshot: {
    name: 'string',
    baseCustomerPrice: 'number',
    customerPricingMethod: {
      _type: 'enum',
      options: Object.values(CUSTOMER_PRICING_METHOD),
    },
    defaultCharacteristics: {
      width: 'number',
      height: 'number',
      thickness: 'number',
    },
  },
  characteristics: {
    width: 'number',
    height: 'number',
    thickness: 'number',
  },
  calculatedProductionCost: 'number',
  calculatedCustomerPrice: 'number',
});

export const schemas = {
  order_group: orderGroupSchema,
  order: orderSchema,
  item: itemSchema,
};
