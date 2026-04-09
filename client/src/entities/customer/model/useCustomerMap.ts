import type { Customer } from './customer';
import { mockCustomers } from './customer.mock';

export const useCustomerMap = () => {
  return {
    customers: Object.fromEntries(
      (mockCustomers ?? []).map((customer) => [customer.id, customer]),
    ) as Record<Customer['id'], Customer>,
    isLoading: false,
  };
};
