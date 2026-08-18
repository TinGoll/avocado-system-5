import { Input, Typography } from 'antd';
import type { FC } from 'react';

import { useOrderStore } from '@entities/order';
import { Editable, Field } from '@shared/ui';

import { useOptimisticOrderUpdate } from '../hooks/useOptimisticOrderUpdate';

import { styles } from './styles';

const { Text } = Typography;

export const CommentField: FC = () => {
  const { currentOrder } = useOrderStore();
  const { updateOrder, isMutating } = useOptimisticOrderUpdate();

  return (
    <Field className={styles.fullWidth}>
      <Field.Label>
        <Text type="secondary">Комментарий</Text>
      </Field.Label>
      <Field.Value>
        <Editable
          className={styles.editable}
          loading={isMutating}
          onSave={(_, value) => updateOrder({ comment: value ?? '' })}
          defaultValue={currentOrder?.comment}
          block
          confirmOnBlur
          name="comment"
          control={(props) => (
            <Input.TextArea
              {...props}
              className={styles.input}
              autoSize={{ minRows: 2, maxRows: 6 }}
              variant="borderless"
            />
          )}
        >
          <Text className={styles.title}>
            {currentOrder?.comment || 'Укажите комментарий'}
          </Text>
        </Editable>
      </Field.Value>
    </Field>
  );
};
