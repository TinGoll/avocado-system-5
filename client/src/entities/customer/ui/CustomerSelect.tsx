import { Select, type SelectProps } from 'antd';
import { useMemo, type FC } from 'react';

import { useCustomers } from '../api/customer.api';

type Props = Omit<SelectProps, 'options'>;

export const CustomerSelect: FC<Props> = (props) => {
  const { customers } = useCustomers();

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
