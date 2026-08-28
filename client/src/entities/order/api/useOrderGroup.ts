import useSWRMutation from 'swr/mutation';

import {
  Endpoints,
  fetcher,
  useEntity,
  type ErrorResponse,
} from '@shared/lib/swr';

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

export type OrderGroupRecalculationResult = {
  updatedItems: number;
  errors: Array<{ orderId: string; itemId: string; message: string }>;
};

export const useRecalculateOrderGroupProductionMutation = (groupID?: number) =>
  useSWRMutation<OrderGroupRecalculationResult, Error, string | null>(
    groupID
      ? `${Endpoints.ORDER_GROUPS}/${groupID}/recalculate-production`
      : null,
    (url) => fetcher<OrderGroupRecalculationResult>({ url, method: 'POST' }),
  );
