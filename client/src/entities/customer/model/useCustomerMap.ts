import { useCustomers } from '../api/customer.api';

export const useCustomerMap = () => {
  const { map, isLoading, error } = useCustomers();

  return {
    customers: map,
    isLoading,
    error,
  };
};
