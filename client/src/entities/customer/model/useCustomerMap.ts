import { mockCustomers } from './customer.mock';
import type { Customer } from './types';

export const useCustomerMap = () => {
  return {
    customers: Object.fromEntries(
      (mockCustomers ?? []).map((customer) => [customer.id, customer]),
    ) as Record<Customer['id'], Customer>,
    isLoading: false,
  };
};
