import { mockCustomers } from '../model/customer.mock';
import type { Customer } from '../model/types';

export const useCustomers = () => ({
  customers: mockCustomers ?? [],
  map: Object.fromEntries(
    (mockCustomers ?? []).map((customer) => [customer.id, customer]),
  ) as Record<Customer['id'], Customer>,
  isLoading: false,
});
