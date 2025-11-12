import { DatePicker, Typography } from 'antd';
import dayjs from 'dayjs';
import type { FC } from 'react';

import { useOrderStore } from '@entities/order';
import { Editable, Field } from '@shared/ui';

import { useOptimisticUpdateOrderGroup } from '../hooks/useOptimisticUpdateOrderGroup';

import { styles } from './styles';

const { Text } = Typography;

export const StartDateField: FC = () => {
  const { currentGroup } = useOrderStore();
  const { updateGroup, isMutating } = useOptimisticUpdateOrderGroup();

  const handleUpdate = (value?: dayjs.Dayjs) => {
    const updatetDate = value ?? dayjs();
    updateGroup({
      startedAt: updatetDate.toDate(),
    });
  };

  return (
    <Field>
      <Field.Label>
        <Text ellipsis type="secondary">
          Дата начала производства
        </Text>
      </Field.Label>
      <Field.Value>
        <Editable<dayjs.Dayjs>
          className={styles.editable}
          loading={isMutating}
          onSave={(_, value) => handleUpdate(value)}
          defaultValue={dayjs(currentGroup?.startedAt)}
          block
          confirmOnBlur
          name="startDate"
          control={(props) => (
            <DatePicker
              {...props}
              className={styles.input}
              size="small"
              variant="borderless"
              autoFocus
              defaultOpen
            />
          )}
        >
          <Text className={styles.title} type="success">
            {currentGroup?.createdAt
              ? dayjs(currentGroup?.startedAt).format('DD.MM.YYYY')
              : 'Дату начала производства'}
          </Text>
        </Editable>
      </Field.Value>
    </Field>
  );
};
