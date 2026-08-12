import { Endpoints, useEntity, type PaginatedResponse } from '@shared/lib/swr';

import type { Customer } from '../model/customer';

type CustomersData = {
  customers: Customer[];
  map: Record<Customer['id'], Customer>;
  meta: PaginatedResponse<Customer>['meta'];
};

const transformCustomers = ({ items, meta }: PaginatedResponse<Customer>) => {
  const customers = items ?? [];

  return {
    customers,
    map: Object.fromEntries(
      customers.map((customer) => [customer.id, customer]),
    ) as Record<Customer['id'], Customer>,
    meta,
  };
};

export const useCustomers = () => {
  const entity = useEntity<Customer, CustomersData>({
    endpoint: Endpoints.CUSTOMERS,
    transform: transformCustomers,
  });
  const { data, isLoading, error } = entity;

  return {
    customers: data?.customers ?? [],
    map: data?.map ?? {},
    isLoading,
    error,
    create: entity.create,
    update: entity.update,
    remove: entity.remove,
  };
};
