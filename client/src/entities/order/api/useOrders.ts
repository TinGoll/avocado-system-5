import { Endpoints, useEntity, type ErrorResponse } from '@shared/lib/swr';

import type { Order } from '../model/types';

type CreateOrderDTO = {
  characteristics: Order['characteristics'];
  orderGroupId: number;
  items: Order['items'];
};

type Responce = {
  orders: Order[];
  meta?: Record<string, unknown>;
  error?: ErrorResponse;
};

export const useOrders = () => {
  return useEntity<Order, Responce, CreateOrderDTO>({
    endpoint: Endpoints.ORDERS,
    transform: ({ items, ...data }) => ({
      orders: items ?? [],
      ...data,
    }),
  });
};
