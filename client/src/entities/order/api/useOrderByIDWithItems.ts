import { Endpoints, useEntityById } from '@shared/lib/swr';

import type { Order } from '../model/types';

type Params = {
  id?: string;
  onSuccess?: (data: Order) => void;
  onError?: (error: Error) => void;
};

export const useOrderByIDWithItems = ({ id, onSuccess, onError }: Params) => {
  return useEntityById<Order>({
    endpoint: Endpoints.ORDERS,
    path: 'with-items',
    id,
    transform: (data) => data,
    onSuccess,
    onError,
  });
};
