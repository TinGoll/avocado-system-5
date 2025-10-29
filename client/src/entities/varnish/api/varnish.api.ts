import { useEntity, type ErrorResponse } from '@shared/lib/swr';
import { Endpoints } from '@shared/lib/swr/endpoints';

import type { Varnish } from '../model/types';

type Responce = {
  varnishes: Varnish[];
  meta?: Record<string, unknown>;
  error?: ErrorResponse;
};
export const useVarnishes = () =>
  useEntity<Varnish, Responce>({
    endpoint: Endpoints.VARNISHES,
    transform: ({ items, ...data }) => ({
      varnishes: items || [],
      ...data,
    }),
  });
