import { useMemo } from 'react';

import { createEntityMap } from '@shared/lib/swr/utils';

import { mockCustomers } from '../model/customer.mock';

export const useCustomers = () => {
  const items = useMemo(() => mockCustomers ?? [], []);

  const map = useMemo(() => createEntityMap(items), [items]);

  return {
    items,
    customers: items,
    map,
    isLoading: false,
  };
};

export const useCustomerMap = () => {
  const { map, isLoading } = useCustomers();

  return useMemo(
    () => ({
      customers: map, // Compatibility: some features expect 'customers' to be a map
      map,
      isLoading,
    }),
    [map, isLoading],
  );
};
