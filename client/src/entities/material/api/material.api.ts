import { useMemo } from 'react';

import { Endpoints, useEntity, type PaginatedResponse } from '@shared/lib/swr';
import { transformEntityResponse } from '@shared/lib/swr/utils';

import type { Material } from '../model/material';

const transformMaterials = (data: PaginatedResponse<Material>) =>
  transformEntityResponse(data, 'materials');

export const useMaterials = () =>
  useEntity<Material, ReturnType<typeof transformMaterials>>({
    endpoint: Endpoints.MATERIALS,
    transform: transformMaterials,
  });

export const useMaterialMap = () => {
  const { data, isLoading } = useMaterials();

  return useMemo(
    () => ({
      materials: data?.map, // Compatibility: some features expect 'materials' to be a map
      map: data?.map,
      isLoading,
    }),
    [data?.map, isLoading],
  );
};
