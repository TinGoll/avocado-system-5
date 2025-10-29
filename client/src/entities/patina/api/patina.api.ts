import { Endpoints, useEntity, type ErrorResponse } from '@shared/lib/swr';

import type { Patina } from '../model/types';

type Responce = {
  patinas: Patina[];
  meta?: Record<string, unknown>;
  error?: ErrorResponse;
};
export const usePatinas = () =>
  useEntity<Patina, Responce>({
    endpoint: Endpoints.PATINAS,
    transform: ({ items, ...data }) => ({
      patinas: items || [],
      ...data,
    }),
  });
