import { Select, type SelectProps } from 'antd';
import { useMemo, type FC } from 'react';

import { useFacadeProfiles } from '../api/facadeProfile.api';

type Props = Omit<SelectProps, 'options'>;

export const FacadeProfileSelect: FC<Props> = (props) => {
  const { data, isLoading } = useFacadeProfiles();

  const options: SelectProps['options'] = useMemo(() => {
    return data?.profiles?.map((item) => ({
      value: item.id,
      label: item.name,
      data: item,
    }));
  }, [data?.profiles]);

  return (
    <Select
      loading={isLoading}
      {...props}
      options={options}
      showSearch
      placeholder="Выберите профиль"
      filterOption={(input, option) => {
        return String(option?.label ?? '')
          .toLowerCase()
          .includes(input.toLowerCase());
      }}
    />
  );
};
