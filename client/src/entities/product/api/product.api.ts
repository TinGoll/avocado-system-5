import { Endpoints, useEntity, type ErrorResponse } from '@shared/lib/swr';

import type {
  CreateProductTemplateDto,
  ProductTemplate,
} from '../model/product';

type Responce = {
  products: ProductTemplate[];
  map?: Record<ProductTemplate['id'], ProductTemplate>;
  meta?: Record<string, unknown>;
  error?: ErrorResponse;
};
export const useProductTemplates = () =>
  useEntity<ProductTemplate, Responce, CreateProductTemplateDto>({
    endpoint: Endpoints.PRODUCTS,
    extraKeysToRevalidate: [Endpoints.PRICE_MODIFIERS],
    transform: ({ items, ...data }) => ({
      products: items || [],
      map: Object.fromEntries((items ?? []).map((item) => [item.id, item])),
      ...data,
    }),
  });
