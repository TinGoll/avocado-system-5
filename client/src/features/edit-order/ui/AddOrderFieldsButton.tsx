import { PlusOutlined } from '@ant-design/icons';
import { Button, Dropdown, type MenuProps } from 'antd';
import { type FC } from 'react';

import { useOrderStore, type OrderCharacteristics } from '@entities/order';

import { useOptimisticOrderUpdate } from '../hooks/useOptimisticOrderUpdate';

const fieldLabels: Record<keyof OrderCharacteristics, string> = {
  material: 'Материал',
  color: 'Цвет',
  patina: 'Патина',
  panel: 'Филёнка',
  profile: 'Профиль',
  varnish: 'Лак',
};

export const AddOrderFieldsButton: FC = () => {
  const { currentOrder } = useOrderStore();
  const { updateCharacteristic, isMutating } = useOptimisticOrderUpdate();

  const missingFields = Object.entries(fieldLabels).filter(
    ([key]) =>
      currentOrder?.characteristics?.[key as keyof OrderCharacteristics] ===
      undefined,
  );

  const items: MenuProps['items'] = missingFields.length
    ? missingFields.map(([key, label]) => ({ key, label }))
    : [{ key: 'empty', label: 'Все поля уже добавлены', disabled: true }];

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'empty') {
      return;
    }

    updateCharacteristic(
      key as keyof OrderCharacteristics,
      {} as OrderCharacteristics[keyof OrderCharacteristics],
    );
  };

  return (
    <Dropdown menu={{ items, onClick: handleClick }} trigger={['click']}>
      <Button
        aria-label="Добавить поле"
        type="text"
        size="small"
        icon={<PlusOutlined />}
        loading={isMutating}
      />
    </Dropdown>
  );
};
