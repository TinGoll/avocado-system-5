import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

import {
  type FinanceAccrual,
  type FinanceListParams,
  type FinancePage,
  type FinancePayment,
  getCustomerLinkIssues,
  getFinanceAccruals,
  getFinanceCustomer,
  getFinanceCustomers,
  getFinancePayments,
  getFinanceSummary,
} from '@shared/api';

export const financeKeys = {
  summary: 'finance/summary',
  accruals: (params: FinanceListParams) =>
    ['finance/accruals', params.search ?? '', params.customerId ?? ''] as const,
  payments: (params: FinanceListParams) =>
    ['finance/payments', params.search ?? '', params.customerId ?? ''] as const,
  customers: (search: string) => ['finance/customers', search] as const,
  customer: (id: string | null) =>
    id ? (`finance/customers/${id}` as const) : null,
  customerLinkIssues: 'order-groups/customer-link-issues',
};

const useFinancePage = <T>(
  key: readonly unknown[],
  params: FinanceListParams,
  load: (params: FinanceListParams) => Promise<FinancePage<T>>,
) => {
  const [older, setOlder] = useState<T[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const { data, error, isLoading, mutate } = useSWR(key, () => load(params), {
    keepPreviousData: true,
    onSuccess: (page) => setNextCursor(page.meta.nextCursor),
  });

  useEffect(() => {
    setOlder([]);
    setNextCursor(null);
  }, [params.customerId, params.search]);

  const items = useMemo(() => {
    const byId = new Map(
      [...(data?.items ?? []), ...older].map((item) => [
        (item as { id: string }).id,
        item,
      ]),
    );
    return [...byId.values()];
  }, [data, older]);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await load({ ...params, cursor: nextCursor });
      setOlder((current) => [...current, ...page.items]);
      setNextCursor(page.meta.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  return {
    items,
    error,
    isLoading,
    loadingMore,
    nextCursor,
    loadMore,
    retry: mutate,
  };
};

export const useFinanceSummary = () =>
  useSWR(financeKeys.summary, getFinanceSummary);

export const useFinanceAccruals = (params: FinanceListParams) =>
  useFinancePage<FinanceAccrual>(
    financeKeys.accruals(params),
    params,
    getFinanceAccruals,
  );

export const useFinancePayments = (params: FinanceListParams) =>
  useFinancePage<FinancePayment>(
    financeKeys.payments(params),
    params,
    getFinancePayments,
  );

export const useFinanceCustomers = (search: string) =>
  useSWR(financeKeys.customers(search), () => getFinanceCustomers(search));

export const useFinanceCustomer = (id: string | null) =>
  useSWR(financeKeys.customer(id), () => getFinanceCustomer(id!));

export const useCustomerLinkIssues = () =>
  useSWR(financeKeys.customerLinkIssues, getCustomerLinkIssues);
