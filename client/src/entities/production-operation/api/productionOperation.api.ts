import { Endpoints, useEntity, type ErrorResponse } from '@shared/lib/swr';

import type { ProductionOperation } from '../model/production-operation';

type Responce = {
  operations: ProductionOperation[];
  meta?: Record<string, unknown>;
  error?: ErrorResponse;
};
export const useProductionOperations = () =>
  useEntity<ProductionOperation, Responce>({
    endpoint: Endpoints.PRODUCTION_OPERAIONS,
    transform: ({ items, ...data }) => ({
      operations: items || [],
      ...data,
    }),
  });
