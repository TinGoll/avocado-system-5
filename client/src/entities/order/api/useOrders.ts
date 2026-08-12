import useSWRMutation from 'swr/mutation';

import {
  Endpoints,
  fetcher,
  useEntity,
  type ErrorResponse,
} from '@shared/lib/swr';

import type { Order } from '../model/order';

type CreateOrderDTO = {
  name?: string;
  characteristics: Order['characteristics'];
  orderGroupId: number;
  items: Array<{
    templateId: string;
    quantity: number;
    characteristics: Order['items'][number]['characteristics'];
  }>;
};

type Responce = {
  orders: Order[];
  meta?: Record<string, unknown>;
  error?: ErrorResponse;
};

export const useOrders = () => {
  return useEntity<Order, Responce, CreateOrderDTO, Partial<Order>>({
    endpoint: Endpoints.ORDERS,
    transform: ({ items, ...data }) => ({
      orders: items ?? [],
      ...data,
    }),
  });
};

export const useOrdersMutations = () => {
  return useEntity<Order, Responce, CreateOrderDTO, Partial<Order>>({
    endpoint: Endpoints.ORDERS,
    disabled: true,
  });
};

export const useCopyOrderMutation = (orderID?: string) => {
  return useEntity<Order, unknown, { name?: string }>({
    endpoint: `${Endpoints.ORDERS}/${orderID}/copy`,
    disabled: !orderID,
  }).create;
};

export const useRecalculateOrderPricesMutation = (orderID?: string) =>
  useSWRMutation<Order, Error, string | null>(
    orderID ? `${Endpoints.ORDERS}/${orderID}/recalculate-prices` : null,
    (url) => fetcher<Order>({ url, method: 'POST' }),
  );
