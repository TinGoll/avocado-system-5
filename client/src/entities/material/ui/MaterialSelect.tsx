import { Select, type SelectProps } from 'antd';
import { useMemo, type FC } from 'react';

import { useMaterials } from '../api/material.api';
import type { Material } from '../model/types';

type Props = Omit<SelectProps, 'options'>;

export const MaterialSelect: FC<Props> = (props) => {
  const { data, isLoading } = useMaterials();

  const options: SelectProps['options'] = useMemo(() => {
    return data?.materials?.map((item) => ({
      value: item.id,
      label: item.name,
      data: item,
    }));
  }, [data?.materials]);

  return (
    <Select<Material>
      loading={isLoading}
      {...props}
      options={options}
      showSearch
      placeholder="Выберите материал"
      filterOption={(input, option) => {
        return String(option?.label ?? '')
          .toLowerCase()
          .includes(input.toLowerCase());
      }}
    />
  );
};
