import { Select, type SelectProps } from 'antd';
import { useMemo, type FC } from 'react';

import { usePatinas } from '../api/patina.api';

type Props = Omit<SelectProps, 'options'>;

export const PatinaSelect: FC<Props> = (props) => {
  const { data, isLoading } = usePatinas();

  const options: SelectProps['options'] = useMemo(() => {
    return data?.patinas?.map((item) => ({
      value: item.id,
      label: item.name,
      data: item,
    }));
  }, [data?.patinas]);

  return (
    <Select
      loading={isLoading}
      {...props}
      options={options}
      showSearch
      placeholder="Выберите патину"
      filterOption={(input, option) => {
        return String(option?.label ?? '')
          .toLowerCase()
          .includes(input.toLowerCase());
      }}
    />
  );
};
