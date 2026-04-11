import { useMemo } from 'react';

import { Endpoints, useEntity, type PaginatedResponse } from '@shared/lib/swr';
import { transformEntityResponse } from '@shared/lib/swr/utils';

import type { FacadePanel } from '../model/facade-panel';

const transformFacadePanels = (data: PaginatedResponse<FacadePanel>) =>
  transformEntityResponse(data, 'panels');

export const useFacadePanels = () =>
  useEntity<FacadePanel, ReturnType<typeof transformFacadePanels>>({
    endpoint: Endpoints.FACADE_PANELS,
    transform: transformFacadePanels,
  });

export const useFacadePanelMap = () => {
  const { data, isLoading } = useFacadePanels();

  return useMemo(
    () => ({
      map: data?.map,
      isLoading,
    }),
    [data?.map, isLoading],
  );
};
