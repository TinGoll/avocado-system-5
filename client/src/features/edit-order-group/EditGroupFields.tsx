import { css } from '@emotion/css';
import { Skeleton, Tooltip, Typography } from 'antd';
import type { FC } from 'react';

import { useLoadOrderGroup, useOrderStore } from '@entities/order';
import { useCopyToClipboard } from '@shared/hooks/useCopyToClipboard';
import { useCurrentOrderGroupID } from '@shared/hooks/useCurrentOrderGroupID';
import { Field, NotFound, ServerError } from '@shared/ui';

import { CustomerField, GroupNameField, StartDateField } from './ui';

const styles = {
  fields: css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
    gap: 0 16px;
  `,
  title: css`
    font-size: 14px;
  `,
  input: css`
    color: inherit;
    font-size: inherit;
    font-weight: inherit;
    width: 100%;
  `,
  editable: css`
    &.editable-container {
      &::before {
        border: none;
      }
    }
  `,
};

const { Text } = Typography;

export const EditGroupFields: FC = () => {
  const { groupID } = useCurrentOrderGroupID();
  const { copyToClipboard } = useCopyToClipboard();
  const { currentGroup } = useOrderStore();

  const { isLoading, error } = useLoadOrderGroup(groupID);

  if (isLoading) {
    return <Skeleton active />;
  }
  if (!isLoading && error && 'status' in error && error.status === 404) {
    return <NotFound />;
  }

  if (!currentGroup) {
    return <ServerError />;
  }

  return (
    <div className={styles.fields}>
      <Field>
        <Field.Label>
          <Text className={styles.title} type="secondary">
            Заказ №
          </Text>
        </Field.Label>
        <Tooltip
          title="Нажми, что бы скопировать ссылку на этот заказ"
          placement="rightTop"
        >
          <Field.Value
            style={{
              minWidth: 60,
            }}
            onClick={() => {
              copyToClipboard(
                String(currentGroup.id),
                'Ссылка на заказ скопирована в буфер обмена',
              );
            }}
          >
            <Text className={styles.title} type="warning">
              {currentGroup.id}
            </Text>
          </Field.Value>
        </Tooltip>
      </Field>
      <GroupNameField />
      <CustomerField />
      <StartDateField />
    </div>
  );
};
