import { Select, type SelectProps } from 'antd';
import { useMemo, type FC } from 'react';

import { useVarnishes } from '../api/varnish.api';

type Props = Omit<SelectProps, 'options'>;

export const VarnishSelect: FC<Props> = (props) => {
  const { data, isLoading } = useVarnishes();

  const options: SelectProps['options'] = useMemo(() => {
    return data?.varnishes?.map((item) => ({
      value: item.id,
      label: item.name,
      data: item,
    }));
  }, [data?.varnishes]);

  return (
    <Select
      loading={isLoading}
      {...props}
      options={options}
      showSearch
      placeholder="Выберите лак"
      filterOption={(input, option) => {
        return String(option?.label ?? '')
          .toLowerCase()
          .includes(input.toLowerCase());
      }}
    />
  );
};
