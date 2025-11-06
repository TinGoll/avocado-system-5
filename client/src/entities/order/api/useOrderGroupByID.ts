import { Endpoints, useEntityById } from '@shared/lib/swr';

import type { OrderGroup } from '../model/types';

export const useOrderGroupByID = (id?: number | null) => {
  return useEntityById<OrderGroup>({
    endpoint: Endpoints.ORDER_GROUPS,
    id,
    transform: (data) => data,
  });
};
