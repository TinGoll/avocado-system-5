import { useSWRConfig } from 'swr';

import {
  adjustFinanceAccrual,
  cancelFinanceAccrual,
  cancelFinancePayment,
  createFinancePayment,
  createManualAccrual,
  createOrderAccrual,
  replaceFinanceAllocations,
  syncFinanceAccrual,
} from '@shared/api';

export const useFinanceMutations = () => {
  const { mutate } = useSWRConfig();

  const invalidate = async () => {
    await mutate(
      (key) => {
        const root =
          typeof key === 'string' ? key : Array.isArray(key) ? key[0] : '';
        return /^(finance\/|orders(?:\/|$)|order-groups(?:\/|$))/.test(
          String(root),
        );
      },
      undefined,
      { revalidate: true },
    );
  };

  return {
    createManualAccrual,
    createOrderAccrual,
    createFinancePayment,
    syncFinanceAccrual,
    adjustFinanceAccrual,
    cancelFinanceAccrual,
    replaceFinanceAllocations,
    cancelFinancePayment,
    invalidate,
  };
};
