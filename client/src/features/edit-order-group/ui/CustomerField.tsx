import { Typography } from 'antd';
import { type FC } from 'react';

import {
  CustomerSelect,
  useCustomerMap,
  type Customer,
} from '@entities/customer';
import { useOrderStore } from '@entities/order';
import { Editable, Field } from '@shared/ui';

import { useOptimisticUpdateOrderGroup } from '../hooks/useOptimisticUpdateOrderGroup';

import { styles } from './styles';

const { Text } = Typography;

export const CustomerField: FC = () => {
  const { currentGroup } = useOrderStore();
  const { customers } = useCustomerMap();
  const { updateGroup, isMutating } = useOptimisticUpdateOrderGroup();

  const handleUpdate = (item?: Customer) => {
    const updateItem = item ?? ({} as Customer);
    updateGroup({
      customer: updateItem,
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
            return handleUpdate(value ? customers?.[value] : undefined);
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
