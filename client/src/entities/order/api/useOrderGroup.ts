import { Endpoints, useEntity, type ErrorResponse } from '@shared/lib/swr';

import type { OrderGroup } from '../model/order';

type OrderGroupCreateDTO = {
  orderNumber: string;
  customer: OrderGroup['customer'];
  comment?: OrderGroup['comment'];
  startedAt?: Date;
};

type OrderGroupUpdateDTO = Partial<OrderGroupCreateDTO> & {
  status?: OrderGroup['status'];
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
  return useEntity<
    OrderGroup,
    Responce,
    OrderGroupCreateDTO,
    OrderGroupUpdateDTO
  >({
    endpoint: Endpoints.ORDER_GROUPS,
    disabled: true,
    extraKeysToRevalidate: ['with-order-ids'],
  });
};
