import { Endpoints, useEntityById } from '@shared/lib/swr';

import type { OrderGroup } from '../model/types';

type OrderGroupWithOrderIDs = OrderGroup & { orderIds: string[] };

export const useOrderGroupByIDWithOrderIDs = (id: number | null) => {
  return useEntityById<OrderGroupWithOrderIDs>({
    endpoint: Endpoints.ORDER_GROUPS,
    path: 'with-order-ids',
    id,
    transform: (data) => data,
  });
};
