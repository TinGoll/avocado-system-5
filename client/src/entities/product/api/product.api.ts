import { Endpoints, useEntity, type PaginatedResponse } from '@shared/lib/swr';
import { transformEntityResponse } from '@shared/lib/swr/utils';

import type { ProductTemplate } from '../model/product';

const transformProductTemplates = (data: PaginatedResponse<ProductTemplate>) =>
  transformEntityResponse(data, 'products');

export const useProductTemplates = () =>
  useEntity<ProductTemplate, ReturnType<typeof transformProductTemplates>>({
    endpoint: Endpoints.PRODUCTS,
    transform: transformProductTemplates,
  });
