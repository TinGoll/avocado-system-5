import { useMemo } from 'react';

import { Endpoints, useEntity, type PaginatedResponse } from '@shared/lib/swr';
import { transformEntityResponse } from '@shared/lib/swr/utils';

import type { Varnish } from '../model/varnish';

const transformVarnishes = (data: PaginatedResponse<Varnish>) =>
  transformEntityResponse(data, 'varnishes');

export const useVarnishes = () =>
  useEntity<Varnish, ReturnType<typeof transformVarnishes>>({
    endpoint: Endpoints.VARNISHES,
    transform: transformVarnishes,
  });

export const useVarnishMap = () => {
  const { data, isLoading } = useVarnishes();
  return useMemo(
    () => ({
      map: data?.map,
      isLoading,
    }),
    [data?.map, isLoading],
  );
};
