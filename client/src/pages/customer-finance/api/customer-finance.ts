import useSWR from 'swr';

import {
  type CustomerFinanceHistoryType,
  getCustomerFinanceHistory,
  getCustomerFinancePage,
} from '@shared/api';

type CustomerFinanceHistoryParams = {
  cursor?: string;
  limit?: number;
  types?: CustomerFinanceHistoryType[];
};

export const customerFinanceKeys = {
  page: (customerId: string | undefined) =>
    customerId ? (`finance/customers/${customerId}/allocation` as const) : null,
  history: (
    customerId: string | undefined,
    { cursor, limit = 10, types = [] }: CustomerFinanceHistoryParams,
  ) =>
    customerId
      ? ([
          `finance/customers/${customerId}/history`,
          cursor ?? '',
          limit,
          types.join(','),
        ] as const)
      : null,
};

export const useCustomerFinancePage = (customerId: string | undefined) =>
  useSWR(customerFinanceKeys.page(customerId), () =>
    getCustomerFinancePage(customerId!),
  );

export const useCustomerFinanceHistory = (
  customerId: string | undefined,
  params: CustomerFinanceHistoryParams = {},
) =>
  useSWR(customerFinanceKeys.history(customerId, params), () =>
    getCustomerFinanceHistory(customerId!, params),
  );
