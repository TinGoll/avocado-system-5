import { Endpoints, useEntity, type ErrorResponse } from '@shared/lib/swr';

import type { FacadeProfile } from '../model/types';

type Responce = {
  profiles: FacadeProfile[];
  meta?: Record<string, unknown>;
  error?: ErrorResponse;
};
export const useFacadeProfiles = () =>
  useEntity<FacadeProfile, Responce>({
    endpoint: Endpoints.FACADE_PROFILES,
    transform: ({ items, ...data }) => ({
      profiles: items || [],
      ...data,
    }),
  });
