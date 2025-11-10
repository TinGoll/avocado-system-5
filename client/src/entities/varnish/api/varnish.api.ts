import { useEntity, type ErrorResponse } from '@shared/lib/swr';
import { Endpoints } from '@shared/lib/swr/endpoints';

import type { Varnish } from '../model/types';

type Responce = {
  varnishes?: Varnish[];
  map?: Record<Varnish['id'], Varnish>;
  meta?: Record<string, unknown>;
  error?: ErrorResponse;
};
export const useVarnishes = () =>
  useEntity<Varnish, Responce>({
    endpoint: Endpoints.VARNISHES,
    transform: ({ items, ...data }) => ({
      varnishes: items || [],
      map: Object.fromEntries((items ?? []).map((item) => [item.id, item])),
      ...data,
    }),
  });

export const useVarnishMap = () => {
  const { data, isLoading } = useVarnishes();
  return {
    map: data?.map,
    isLoading,
  };
};
