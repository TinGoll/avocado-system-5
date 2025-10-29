import { Endpoints, useEntity, type ErrorResponse } from '@shared/lib/swr';

import type { FacadePanel } from '../model/types';

type Responce = {
  panels: FacadePanel[];
  meta?: Record<string, unknown>;
  error?: ErrorResponse;
};
export const useFacadePanels = () =>
  useEntity<FacadePanel, Responce>({
    endpoint: Endpoints.FACADE_PANELS,
    transform: ({ items, ...data }) => ({
      panels: items || [],
      ...data,
    }),
  });
