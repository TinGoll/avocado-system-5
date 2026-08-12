import type { CatalogRecord } from './catalog';

export type CatalogPath = readonly string[];

export const toCatalogPath = (
  dataIndex: string | readonly string[],
): CatalogPath => (typeof dataIndex === 'string' ? [dataIndex] : dataIndex);

export const getCatalogValue = (source: unknown, path: CatalogPath): unknown =>
  path.reduce<unknown>((value, key) => {
    if (typeof value !== 'object' || value === null) return undefined;
    return (value as Record<string, unknown>)[key];
  }, source);

export const setCatalogValue = (
  target: Record<string, unknown>,
  path: CatalogPath,
  value: unknown,
): void => {
  let current = target;
  path.forEach((key, index) => {
    if (index === path.length - 1) {
      current[key] = value;
      return;
    }

    const next = current[key];
    if (typeof next !== 'object' || next === null || Array.isArray(next)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  });
};

export const buildCatalogInlineUpdate = <T extends CatalogRecord>(
  record: T,
  path: CatalogPath,
  value: unknown,
): Record<string, unknown> => {
  if (path.length === 1) return { [path[0]]: value };

  const root = path[0];
  const nestedValue = getCatalogValue(record, [root]);
  const nested =
    typeof nestedValue === 'object' && nestedValue !== null
      ? structuredClone(nestedValue as object)
      : {};
  setCatalogValue(nested as Record<string, unknown>, path.slice(1), value);
  return { [root]: nested };
};
