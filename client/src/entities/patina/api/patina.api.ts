import { useMemo } from 'react';

import { Endpoints, useEntity, type PaginatedResponse } from '@shared/lib/swr';
import { transformEntityResponse } from '@shared/lib/swr/utils';

import type { Patina } from '../model/patina';

const transformPatinas = (data: PaginatedResponse<Patina>) =>
  transformEntityResponse(data, 'patinas');

export const usePatinas = () =>
  useEntity<Patina, ReturnType<typeof transformPatinas>>({
    endpoint: Endpoints.PATINAS,
    transform: transformPatinas,
  });

export const usePatinaMap = () => {
  const { data, isLoading } = usePatinas();

  return useMemo(
    () => ({
      map: data?.map,
      isLoading,
    }),
    [data?.map, isLoading],
  );
};
