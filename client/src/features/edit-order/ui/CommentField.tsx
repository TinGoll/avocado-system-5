import { Typography } from 'antd';
import type { FC } from 'react';

import { useOrderStore } from '@entities/order';
import { Editable, Field } from '@shared/ui';
import { MarkdownEditor, MarkdownPreview } from '@shared/ui/markdown';

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
          name="comment"
          control={(props) => (
            <MarkdownEditor
              className={styles.input}
              value={props.value}
              onChange={props.onChange}
            />
          )}
        >
          <MarkdownPreview
            className={styles.title}
            emptyText="Укажите комментарий"
            value={currentOrder?.comment}
          />
        </Editable>
      </Field.Value>
    </Field>
  );
};
