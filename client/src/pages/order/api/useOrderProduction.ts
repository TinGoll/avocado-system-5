import useSWR from 'swr';

import { orderManagementKeys, type OrderProductionSummary } from '@shared/api';
import { fetcher } from '@shared/lib/swr';

export const useOrderProduction = (groupId: number | null) =>
  useSWR<OrderProductionSummary>(
    groupId === null ? null : orderManagementKeys.production(groupId),
    (url: string) => fetcher<OrderProductionSummary>({ url }),
  );
