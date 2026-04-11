import type { BaseEntity, PaginatedResponse } from './types';

export const createEntityMap = <T extends BaseEntity>(items: T[] = []) => {
  return Object.fromEntries(items.map((item) => [item.id, item])) as Record<
    T['id'],
    T
  >;
};

export const transformEntityResponse = <T extends BaseEntity, K extends string>(
  data: PaginatedResponse<T>,
  key: K,
) => {
  const items = data.items ?? [];
  const map = createEntityMap(items);

  return {
    items,
    map,
    [key]: items, // Alias for backward compatibility
    meta: data.meta,
    error: data.error,
  } as PaginatedResponse<T> & {
    items: T[];
    map: Record<T['id'], T>;
  } & Record<K, T[]>;
};
