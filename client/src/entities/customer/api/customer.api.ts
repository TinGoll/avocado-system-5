import type { Customer } from '../model/customer';
import { mockCustomers } from '../model/customer.mock';

export const useCustomers = () => ({
  customers: mockCustomers ?? [],
  map: Object.fromEntries(
    (mockCustomers ?? []).map((customer) => [customer.id, customer]),
  ) as Record<Customer['id'], Customer>,
  isLoading: false,
});
