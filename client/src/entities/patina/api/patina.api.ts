import { Endpoints, useEntity, type ErrorResponse } from '@shared/lib/swr';

import type { Patina } from '../model/types';

type Responce = {
  patinas?: Patina[];
  map?: Record<Patina['id'], Patina>;
  meta?: Record<string, unknown>;
  error?: ErrorResponse;
};
export const usePatinas = () =>
  useEntity<Patina, Responce>({
    endpoint: Endpoints.PATINAS,
    transform: ({ items, ...data }) => ({
      map: Object.fromEntries((items ?? []).map((item) => [item.id, item])),
      patinas: items || [],
      ...data,
    }),
  });

export const usePatinaMap = () => {
  const { data, isLoading } = usePatinas();
  return {
    map: data?.map,
    isLoading,
  };
};
