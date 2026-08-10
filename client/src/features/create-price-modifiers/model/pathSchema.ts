import {
  CONDITION_OPERATOR,
  type ConditionOperator,
  type ConditionSource,
} from '@entities/price-modifiers';

export type SchemaField =
  | { readonly label: string; readonly type: 'string' }
  | { readonly label: string; readonly type: 'number' }
  | {
      readonly label: string;
      readonly type: 'enum';
      readonly options: readonly string[];
    };

export type SchemaGroup = {
  readonly label: string;
  readonly children: PathSchema;
};

export type SchemaNode = SchemaField | SchemaGroup;

export type PathSchema = {
  readonly [key: string]: SchemaNode;
};

export type PriceModifierConditionPathSchemas = Record<
  ConditionSource,
  PathSchema
>;

export const isSchemaLeaf = (node: SchemaNode): node is SchemaField =>
  Object.hasOwn(node, 'type');

export const getFieldTypeFromPath = (
  schema: PathSchema | undefined,
  path: string,
): SchemaField | undefined => {
  if (!schema || !path) return undefined;

  const parts = path.split('.');
  let currentSchema = schema;
  for (const [index, part] of parts.entries()) {
    const node = currentSchema[part];
    if (!node) return undefined;
    if (index === parts.length - 1) {
      return isSchemaLeaf(node) ? node : undefined;
    }
    if (isSchemaLeaf(node)) return undefined;
    currentSchema = node.children;
  }

  return undefined;
};

export const getSelectablePaths = (schema: PathSchema, prefix = ''): string[] =>
  Object.entries(schema).flatMap(([key, node]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return isSchemaLeaf(node)
      ? [path]
      : getSelectablePaths(node.children, path);
  });

const comparisonOperators: readonly ConditionOperator[] = [
  CONDITION_OPERATOR.EQ,
  CONDITION_OPERATOR.GT,
  CONDITION_OPERATOR.LT,
  CONDITION_OPERATOR.GTE,
  CONDITION_OPERATOR.LTE,
];

export const getAllowedOperators = (
  field: SchemaField | undefined,
): readonly ConditionOperator[] =>
  field?.type === 'number' ? comparisonOperators : [CONDITION_OPERATOR.EQ];

export const getValueEditorType = (
  field: SchemaField | undefined,
): SchemaField['type'] | undefined => field?.type;
