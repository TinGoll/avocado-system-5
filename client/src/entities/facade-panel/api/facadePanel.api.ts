import { Endpoints, useEntity, type ErrorResponse } from '@shared/lib/swr';

import type { FacadePanel } from '../model/types';

type Responce = {
  panels?: FacadePanel[];
  map?: Record<FacadePanel['id'], FacadePanel>;
  meta?: Record<string, unknown>;
  error?: ErrorResponse;
};
export const useFacadePanels = () =>
  useEntity<FacadePanel, Responce>({
    endpoint: Endpoints.FACADE_PANELS,
    transform: ({ items, ...data }) => ({
      panels: items || [],
      map: Object.fromEntries((items ?? []).map((item) => [item.id, item])),
      ...data,
    }),
  });

export const useFacadePanelMap = () => {
  const { data, isLoading } = useFacadePanels();
  return {
    map: data?.map,
    isLoading,
  };
};
