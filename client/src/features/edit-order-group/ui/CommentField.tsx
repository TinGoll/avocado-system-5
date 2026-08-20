import { Typography } from 'antd';
import type { FC } from 'react';

import { useOrderStore } from '@entities/order';
import { Editable, Field } from '@shared/ui';
import { MarkdownEditor, MarkdownPreview } from '@shared/ui/markdown';

import { useOptimisticUpdateOrderGroup } from '../hooks/useOptimisticUpdateOrderGroup';

import { styles } from './styles';

const { Text } = Typography;

export const CommentField: FC = () => {
  const { currentGroup } = useOrderStore();
  const { updateGroup, isMutating } = useOptimisticUpdateOrderGroup();

  return (
    <Field className={styles.fullWidth}>
      <Field.Label>
        <Text type="secondary">Комментарий</Text>
      </Field.Label>
      <Field.Value>
        <Editable
          className={styles.editable}
          loading={isMutating}
          onSave={(_, value) => updateGroup({ comment: value ?? '' })}
          defaultValue={currentGroup?.comment}
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
            value={currentGroup?.comment}
          />
        </Editable>
      </Field.Value>
    </Field>
  );
};
