import { Select, type SelectProps } from 'antd';
import { useMemo, type FC } from 'react';

import { useColors } from '../api/colors.api';

type Props = Omit<SelectProps, 'options'>;

export const ColorSelect: FC<Props> = (props) => {
  const { data, isLoading } = useColors();

  const options: SelectProps['options'] = useMemo(() => {
    return data?.colors?.map((item) => ({
      value: item.id,
      label: item.name,
      data: item,
    }));
  }, [data?.colors]);

  return (
    <Select
      loading={isLoading}
      {...props}
      options={options}
      showSearch
      placeholder="Выберите цвет"
      filterOption={(input, option) => {
        return String(option?.label ?? '')
          .toLowerCase()
          .includes(input.toLowerCase());
      }}
    />
  );
};
