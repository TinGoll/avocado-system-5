import { Input, Typography } from 'antd';
import { type FC } from 'react';

import { useOrderStore } from '@entities/order';
import { Editable, Field } from '@shared/ui';

import { useOptimisticUpdateOrderGroup } from '../hooks/useOptimisticUpdateOrderGroup';

import { styles } from './styles';

const { Text } = Typography;

export const GroupNameField: FC = () => {
  const { currentGroup } = useOrderStore();
  const { updateGroup, isMutating } = useOptimisticUpdateOrderGroup();

  const handleUpdate = (name?: string) => {
    const updateName = name ?? '';
    updateGroup({
      orderNumber: updateName,
    });
  };

  return (
    <Field>
      <Field.Label>
        <Text type="secondary">Название заказа</Text>
      </Field.Label>
      <Field.Value>
        <Editable
          className={styles.editable}
          loading={isMutating}
          onSave={(_, value) => handleUpdate(value)}
          defaultValue={currentGroup?.orderNumber}
          block
          confirmOnBlur
          name="orderNumber"
          control={(props) => (
            <Input
              {...props}
              className={styles.input}
              size="small"
              variant="borderless"
            />
          )}
        >
          <Text className={styles.title} type="success">
            {currentGroup?.orderNumber || 'Укажите название заказа'}
          </Text>
        </Editable>
      </Field.Value>
    </Field>
  );
};
