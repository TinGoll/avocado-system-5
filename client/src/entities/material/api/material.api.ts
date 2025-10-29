import { Endpoints, useEntity, type ErrorResponse } from '@shared/lib/swr';

import type { Material } from '../model/types';

type Responce = {
  materials: Material[];
  meta?: Record<string, unknown>;
  error?: ErrorResponse;
};
export const useMaterials = () =>
  useEntity<Material, Responce>({
    endpoint: Endpoints.MATERIALS,
    transform: ({ items, ...data }) => ({
      materials: items || [],
      ...data,
    }),
  });
