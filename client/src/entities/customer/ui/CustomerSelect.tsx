import { Select, type SelectProps } from 'antd';
import { useMemo, type FC } from 'react';

import { useCustomers } from '../api/customer.api';

type Props = Omit<SelectProps, 'options'>;

export const CustomerSelect: FC<Props> = (props) => {
  const { customers, isLoading, error } = useCustomers();

  const options: SelectProps['options'] = useMemo(() => {
    return customers.map((customer) => ({
      value: customer.id,
      label: customer.name,
      data: customer,
    }));
  }, [customers]);

  return (
    <Select
      {...props}
      loading={isLoading}
      status={error ? 'error' : props.status}
      notFoundContent={error ? 'Не удалось загрузить заказчиков' : undefined}
      options={options}
      showSearch
      placeholder="Выберите заказчика"
      filterOption={(input, option) => {
        return String(option?.label ?? '')
          .toLowerCase()
          .includes(input.toLowerCase());
      }}
    />
  );
};
