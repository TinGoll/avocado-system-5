import { Endpoints, useEntity, type ErrorResponse } from '@shared/lib/swr';

import type { ProductTemplate } from '../model/types';

type Responce = {
  panels: ProductTemplate[];
  meta?: Record<string, unknown>;
  error?: ErrorResponse;
};
export const useProductTemplates = () =>
  useEntity<ProductTemplate, Responce>({
    endpoint: Endpoints.PRODUCTS,
    transform: ({ items, ...data }) => ({
      panels: items || [],
      ...data,
    }),
  });
