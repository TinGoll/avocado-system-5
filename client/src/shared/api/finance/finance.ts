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

export type FinanceAllocationInput = { accrualId: string; amount: string };
export type CreateManualAccrualInput = {
  customerId: string;
  title: string;
  amount: string;
  effectiveDate: string;
  reason?: string;
  requestId: string;
};
export type CreatePaymentInput = {
  customerId: string;
  amount: string;
  paymentDate: string;
  method: FinancePayment['method'];
  externalReference?: string;
  comment?: string;
  requestId: string;
  allocations?: FinanceAllocationInput[];
};
export type VersionedFinanceCommand = {
  expectedVersion: number;
  effectiveDate: string;
  requestId: string;
};
export type AdjustAccrualInput = VersionedFinanceCommand & {
  amount: string;
  reason: string;
};
export type CancelAccrualInput = VersionedFinanceCommand & { reason: string };
export type ReplaceAllocationsInput = {
  allocations: FinanceAllocationInput[];
  expectedVersion: number;
  reason?: string;
};
export type CancelPaymentInput = {
  cancellationDate: string;
  reason: string;
  expectedVersion: number;
  requestId: string;
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

export const createManualAccrual = (data: CreateManualAccrualInput) =>
  fetcher<FinanceAccrual, CreateManualAccrualInput>({
    url: 'finance/accruals/manual',
    method: 'POST',
    data,
  });
export const createFinancePayment = (data: CreatePaymentInput) =>
  fetcher<FinancePaymentDetail, CreatePaymentInput>({
    url: 'finance/payments',
    method: 'POST',
    data,
  });
export const syncFinanceAccrual = (id: string, data: VersionedFinanceCommand) =>
  fetcher<FinanceAccrual, VersionedFinanceCommand>({
    url: `finance/accruals/${id}/sync-order-total`,
    method: 'POST',
    data,
  });
export const adjustFinanceAccrual = (id: string, data: AdjustAccrualInput) =>
  fetcher<FinanceAccrual, AdjustAccrualInput>({
    url: `finance/accruals/${id}/adjustments`,
    method: 'POST',
    data,
  });
export const cancelFinanceAccrual = (id: string, data: CancelAccrualInput) =>
  fetcher<FinanceAccrual, CancelAccrualInput>({
    url: `finance/accruals/${id}/cancel`,
    method: 'POST',
    data,
  });
export const replaceFinanceAllocations = (
  id: string,
  data: ReplaceAllocationsInput,
) =>
  fetcher<FinancePaymentDetail, ReplaceAllocationsInput>({
    url: `finance/payments/${id}/allocations`,
    method: 'PUT',
    data,
  });
export const cancelFinancePayment = (id: string, data: CancelPaymentInput) =>
  fetcher<FinancePaymentDetail, CancelPaymentInput>({
    url: `finance/payments/${id}/cancel`,
    method: 'POST',
    data,
  });
