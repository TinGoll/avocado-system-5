import useSWR from 'swr';

import { getFinanceOrderGroup } from '@shared/api';

export const orderFinanceKey = (orderGroupId: number | null) =>
  orderGroupId === null ? null : `finance/order-groups/${orderGroupId}`;

export const useOrderFinance = (orderGroupId: number | null) =>
  useSWR(orderFinanceKey(orderGroupId), () =>
    getFinanceOrderGroup(orderGroupId!),
  );
