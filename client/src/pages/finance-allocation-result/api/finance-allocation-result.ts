import useSWR from 'swr';

import { getFinanceAllocationBatch } from '@shared/api';

export const financeAllocationResultKey = (operationId: number | null) =>
  operationId ? (`finance/allocation-batches/${operationId}` as const) : null;

export const useFinanceAllocationResult = (operationId: number | null) =>
  useSWR(financeAllocationResultKey(operationId), () =>
    getFinanceAllocationBatch(operationId!),
  );
