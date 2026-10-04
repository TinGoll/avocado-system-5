import useSWR from 'swr';

import { getCustomerFinanceHistory, getCustomerFinancePage } from '@shared/api';

export const customerFinanceKeys = {
  page: (customerId: string | undefined) =>
    customerId ? (`finance/customers/${customerId}/allocation` as const) : null,
  history: (customerId: string | undefined) =>
    customerId ? (`finance/customers/${customerId}/history` as const) : null,
};

export const useCustomerFinancePage = (customerId: string | undefined) =>
  useSWR(customerFinanceKeys.page(customerId), () =>
    getCustomerFinancePage(customerId!),
  );

export const useCustomerFinanceHistory = (customerId: string | undefined) =>
  useSWR(customerFinanceKeys.history(customerId), () =>
    getCustomerFinanceHistory(customerId!, { limit: 50 }),
  );
