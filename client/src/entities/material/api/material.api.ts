import { Endpoints, useEntity, type ErrorResponse } from '@shared/lib/swr';

import type { Material } from '../model/types';

type Responce = {
  materials: Material[];
  map: Record<Material['id'], Material>;
  meta?: Record<string, unknown>;
  error?: ErrorResponse;
};
export const useMaterials = () =>
  useEntity<Material, Responce>({
    endpoint: Endpoints.MATERIALS,
    transform: ({ items, ...data }) => ({
      materials: items ?? [],
      map: Object.fromEntries(
        (items ?? []).map((item) => [item.id, item]),
      ) as Record<Material['id'], Material>,
      ...data,
    }),
  });

export const useMaterialMap = () => {
  const { data, isLoading } = useMaterials();
  return {
    materials: data?.map,
    isLoading,
  };
};
