import { Typography } from 'antd';
import { type FC } from 'react';

import { CustomerSelect } from '@entities/customer';
import { useOrderStore } from '@entities/order';
import { Editable, Field } from '@shared/ui';

import { useOptimisticUpdateOrderGroup } from '../hooks/useOptimisticUpdateOrderGroup';

import { styles } from './styles';

const { Text } = Typography;

export const CustomerField: FC = () => {
  const { currentGroup } = useOrderStore();
  const { updateGroup, isMutating } = useOptimisticUpdateOrderGroup();

  const handleUpdate = (customerId?: string) => {
    updateGroup({
      customerId: customerId ?? null,
    });
  };

  return (
    <Field>
      <Field.Label>
        <Text type="secondary">Заказчик</Text>
      </Field.Label>
      <Field.Value>
        <Editable
          name="customer"
          className={styles.editable}
          loading={isMutating}
          onSave={(_, value) => {
            return handleUpdate(value);
          }}
          defaultValue={currentGroup?.customer?.name}
          block
          confirmOnBlur
          control={(props) => (
            <CustomerSelect
              {...props}
              className={styles.input}
              size="small"
              variant="borderless"
              defaultOpen
              autoFocus
            />
          )}
        >
          {currentGroup?.customer?.name ? (
            <Text className={styles.title} type="success">
              {currentGroup?.customer?.name}
            </Text>
          ) : (
            <Text type="secondary">Выбери заказчика</Text>
          )}
        </Editable>
      </Field.Value>
    </Field>
  );
};
