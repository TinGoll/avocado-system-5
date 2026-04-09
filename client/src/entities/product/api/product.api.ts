import { Endpoints, useEntity, type ErrorResponse } from '@shared/lib/swr';

import type { ProductTemplate } from '../model/product';

type Responce = {
  products: ProductTemplate[];
  map?: Record<ProductTemplate['id'], ProductTemplate>;
  meta?: Record<string, unknown>;
  error?: ErrorResponse;
};
export const useProductTemplates = () =>
  useEntity<ProductTemplate, Responce>({
    endpoint: Endpoints.PRODUCTS,
    transform: ({ items, ...data }) => ({
      products: items || [],
      map: Object.fromEntries((items ?? []).map((item) => [item.id, item])),
      ...data,
    }),
  });
