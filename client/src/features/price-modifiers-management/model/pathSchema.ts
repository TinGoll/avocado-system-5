export type SchemaField =
  | 'string'
  | 'number'
  | { type: 'enum'; options: readonly string[] };

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
  if (typeof field === 'object' && field !== null && 'type' in field) {
    return true;
  }
  return false;
};

export const orderSchema = createSchema({
  id: 'string',
  totalPrice: 'number',
  itemCount: 'number',
  customer: {
    id: 'string',
    name: 'string',
    level: { type: 'enum', options: ['bronze', 'silver', 'gold'] as const },
    address: {
      city: 'string',
      street: 'string',
    },
  },
});

export const itemSchema = createSchema({
  quantity: 'number',
  price: 'number',
  productDetails: {
    name: 'string',
    category: 'string',
    weight: 'number',
  },
});

export const schemas = {
  order: orderSchema,
  item: itemSchema,
};
