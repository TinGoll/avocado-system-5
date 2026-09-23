import { fetcher } from '@shared/lib/swr';

export type FinancePageMeta = { limit?: number; nextCursor: string | null };
export type FinancePage<T> = { items: T[]; meta: FinancePageMeta };
export type FinanceMoney = { amountMinor: number; amount: string };

export type FinanceSummary = {
  accruedMinor: number;
  accrued: string;
  paidMinor: number;
  paid: string;
  balanceMinor: number;
  balance: string;
  debtMinor: number;
  debt: string;
  advanceMinor: number;
  advance: string;
  allocatedMinor: number;
  allocated: string;
  unallocatedMinor: number;
  unallocated: string;
  customerLinkIssuesCount: number;
};

export type FinanceAccrual = {
  id: string;
  customerId: string;
  customerName: string;
  sourceType: 'order' | 'manual';
  orderGroupId: number | null;
  orderNumber: string | null;
  title: string;
  status: 'active' | 'cancelled';
  version: number;
  businessDate: string;
  amountMinor: number;
  amount: string;
  allocatedMinor: number;
  allocated: string;
  remainingMinor: number;
  remaining: string;
  state: 'unpaid' | 'partially_paid' | 'paid' | 'cancelled';
};

export type FinancePayment = {
  id: string;
  customerId: string;
  customerName: string;
  businessDate: string;
  method: 'cash' | 'card' | 'bank_transfer' | 'other';
  externalReference: string | null;
  comment: string | null;
  status: 'posted' | 'cancelled';
  version: number;
  amountMinor: number;
  amount: string;
  allocatedMinor: number;
  allocated: string;
  unallocatedMinor: number;
  unallocated: string;
  allocationState: 'unallocated' | 'partial' | 'allocated';
};

export type FinanceAllocation = {
  id: string;
  accrualId: string;
  amountMinor: number;
  amount: string;
  status: 'active' | 'released';
  releasedAt: string | null;
  releaseReason: string | null;
};

export type FinancePaymentDetail = FinancePayment & {
  paymentDate: string;
  allocations: FinanceAllocation[];
};

export type FinanceCustomerListItem = {
  id: string;
  name: string;
  companyName: string | null;
  debtMinor: number;
  debt: string;
  advanceMinor: number;
  advance: string;
  unallocatedMinor: number;
  unallocated: string;
};

export type FinanceOperation = {
  kind: string;
  businessDate: string;
  id: string;
  amountMinor: number;
  amount: string;
  title: string;
};

export type FinanceCustomer = FinanceSummary & {
  customer: { id: string; name: string; companyName: string | null };
  recentOperations: FinanceOperation[];
  openAccruals: FinanceAccrual[];
};

export type CustomerLinkIssue = {
  id: number;
  orderNumber: string;
  reason: 'customer_not_found' | 'missing_or_invalid_customer_id';
};

export type FinanceListParams = {
  search?: string;
  customerId?: string;
  cursor?: string;
  limit?: number;
};

const queryString = (params: FinanceListParams = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const suffix = query.toString();
  return suffix ? `?${suffix}` : '';
};

export const getFinanceSummary = () =>
  fetcher<FinanceSummary>({ url: 'finance/summary' });
export const getFinanceAccruals = (params?: FinanceListParams) =>
  fetcher<FinancePage<FinanceAccrual>>({
    url: `finance/accruals${queryString(params)}`,
  });
export const getFinancePayments = (params?: FinanceListParams) =>
  fetcher<FinancePage<FinancePayment>>({
    url: `finance/payments${queryString(params)}`,
  });
export const getFinancePayment = (id: string) =>
  fetcher<FinancePaymentDetail>({ url: `finance/payments/${id}` });
export const getFinanceCustomers = (search?: string) =>
  fetcher<{ items: FinanceCustomerListItem[]; meta: { count: number } }>({
    url: `finance/customers${queryString({ search })}`,
  });
export const getFinanceCustomer = (id: string) =>
  fetcher<FinanceCustomer>({ url: `finance/customers/${id}` });
export const getCustomerLinkIssues = () =>
  fetcher<{ items: CustomerLinkIssue[]; meta: { count: number } }>({
    url: 'order-groups/customer-link-issues',
  });
