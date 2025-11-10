import { Endpoints, useEntity, type ErrorResponse } from '@shared/lib/swr';

import type { FacadeProfile } from '../model/types';

type Responce = {
  profiles?: FacadeProfile[];
  map?: Record<FacadeProfile['id'], FacadeProfile>;
  meta?: Record<string, unknown>;
  error?: ErrorResponse;
};
export const useFacadeProfiles = () =>
  useEntity<FacadeProfile, Responce>({
    endpoint: Endpoints.FACADE_PROFILES,
    transform: ({ items, ...data }) => ({
      profiles: items || [],
      map: Object.fromEntries((items ?? []).map((item) => [item.id, item])),
      ...data,
    }),
  });

export const useFacadeProfileMap = () => {
  const { data, isLoading } = useFacadeProfiles();
  return {
    map: data?.map,
    isLoading,
  };
};
