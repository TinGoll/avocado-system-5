import type { ConditionSource } from '@entities/price-modifiers';

export type SchemaField =
  | 'string'
  | 'number'
  | { _type: 'enum'; options: readonly string[] };

export type PathSchema = {
  readonly [key: string]: SchemaField | PathSchema;
};

export type PriceModifierConditionPathSchemas = Record<
  ConditionSource,
  PathSchema
>;

export const getFieldTypeFromPath = (
  schema: PathSchema | undefined,
  path: string,
): SchemaField | undefined => {
  if (!schema || !path) return undefined;

  let current: SchemaField | PathSchema = schema;
  for (const part of path.split('.')) {
    if (isSchemaLeaf(current) || !Object.hasOwn(current, part)) {
      return undefined;
    }
    current = current[part];
  }

  return isSchemaLeaf(current) ? current : undefined;
};

export const isSchemaLeaf = (
  field: SchemaField | PathSchema,
): field is SchemaField =>
  typeof field === 'string' || Object.hasOwn(field, '_type');

export const getSelectablePaths = (schema: PathSchema, prefix = ''): string[] =>
  Object.entries(schema).flatMap(([key, field]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return isSchemaLeaf(field) ? [path] : getSelectablePaths(field, path);
  });
