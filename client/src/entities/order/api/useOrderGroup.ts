import { Endpoints, useEntity, type ErrorResponse } from '@shared/lib/swr';

import type { OrderGroup } from '../model/types';

type OrderGroupCreateDTO = {
  orderNumber: string;
  customer: OrderGroup['customer'];
  status: OrderGroup['status'];
  startedAt?: Date;
};

type Responce = {
  groups: OrderGroup[];
  meta?: Record<string, unknown>;
  error?: ErrorResponse;
};

export const useOrderGroups = () => {
  return useEntity<OrderGroup, Responce, OrderGroupCreateDTO>({
    endpoint: Endpoints.ORDER_GROUPS,
    transform: ({ items, ...data }) => ({
      groups: items ?? [],
      ...data,
    }),
  });
};

export const useOrderGroupMutations = () => {
  return useEntity<OrderGroup, Responce, OrderGroupCreateDTO>({
    endpoint: Endpoints.ORDER_GROUPS,
    disabled: true,
  });
};
