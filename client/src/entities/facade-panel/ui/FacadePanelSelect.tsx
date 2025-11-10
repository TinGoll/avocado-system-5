import { Select, type SelectProps } from 'antd';
import { useMemo, type FC } from 'react';

import { useFacadePanels } from '../api/facadePanel.api';

type Props = Omit<SelectProps, 'options'>;

export const FacadePanelSelect: FC<Props> = (props) => {
  const { data, isLoading } = useFacadePanels();

  const options: SelectProps['options'] = useMemo(() => {
    return data?.panels?.map((item) => ({
      value: item.id,
      label: item.name,
      data: item,
    }));
  }, [data?.panels]);

  return (
    <Select
      loading={isLoading}
      {...props}
      options={options}
      showSearch
      placeholder="Выберите филёнку"
      filterOption={(input, option) => {
        return String(option?.label ?? '')
          .toLowerCase()
          .includes(input.toLowerCase());
      }}
    />
  );
};
