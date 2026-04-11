import { useMemo } from 'react';

import {
  Endpoints,
  useEntity,
  type FacadeProfile,
  type PaginatedResponse,
} from '@shared/lib/swr';
import { transformEntityResponse } from '@shared/lib/swr/utils';

const transformFacadeProfiles = (data: PaginatedResponse<FacadeProfile>) =>
  transformEntityResponse(data, 'profiles');

export const useFacadeProfiles = () =>
  useEntity<FacadeProfile, ReturnType<typeof transformFacadeProfiles>>({
    endpoint: Endpoints.FACADE_PROFILES,
    transform: transformFacadeProfiles,
  });

export const useFacadeProfileMap = () => {
  const { data, isLoading } = useFacadeProfiles();

  return useMemo(
    () => ({
      map: data?.map,
      isLoading,
    }),
    [data?.map, isLoading],
  );
};
