import { Endpoints, useEntity, type PaginatedResponse } from '@shared/lib/swr';
import { transformEntityResponse } from '@shared/lib/swr/utils';

import type { ProductionOperation } from '../model/production-operation';

const transformProductionOperations = (
  data: PaginatedResponse<ProductionOperation>,
) => transformEntityResponse(data, 'operations');

export const useProductionOperations = () =>
  useEntity<
    ProductionOperation,
    ReturnType<typeof transformProductionOperations>
  >({
    endpoint: Endpoints.PRODUCTION_OPERAIONS,
    transform: transformProductionOperations,
  });
