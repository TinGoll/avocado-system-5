import { PlusOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import { Input, Skeleton, Tooltip, Typography } from 'antd';
import { useEffect, useState, type FC } from 'react';

import { CustomerSelect, useCustomerMap } from '@entities/customer';
import { useOrderStore } from '@entities/order';
import { CreateColorButton } from '@features/create-color';
import { useCopyToClipboard } from '@shared/hooks/useCopyToClipboard';
import { Editable } from '@shared/ui/editable';
import { Field } from '@shared/ui/Field';

import { useLoadOrderGroup } from '../hooks/useLoadOrderGroup';
import { useOptimisticUpdateOrderGroup } from '../hooks/useOptimisticUpdateOrderGroup';

import { NotFound } from './NotFound';
import { ServerError } from './ServerError';

const styles = {
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

type Props = {
  groupID: number | null;
};

const { Text } = Typography;

export const EditOrderGroupForm: FC<Props> = ({ groupID }) => {
  const { customers } = useCustomerMap();
  const [loadings, setLoadings] = useState<Record<string, boolean>>({});
  const { copyToClipboard } = useCopyToClipboard();

  const { isLoading, error } = useLoadOrderGroup(groupID);

  const { updateGroup } = useOptimisticUpdateOrderGroup();
  const { currentGroup } = useOrderStore();

  useEffect(() => {
    setLoadings({});
  }, [groupID]);

  const handleSetLoading = (name: string, value: boolean): void => {
    setLoadings((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (name: string, value?: unknown) => {
    if (!groupID) {
      return;
    }
    handleSetLoading(name, true);
    await updateGroup({
      [name]: value,
    });
    handleSetLoading(name, false);
  };

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
    <div>
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
      <Field>
        <Field.Label>
          <Text type="secondary">Название заказа:</Text>
        </Field.Label>
        <Field.Value>
          <Editable
            className={styles.editable}
            loading={loadings['orderNumber']}
            onSave={handleUpdate}
            defaultValue={currentGroup.orderNumber}
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
              {currentGroup.orderNumber || 'Укажите название заказа'}
            </Text>
          </Editable>
        </Field.Value>
      </Field>
      <Field>
        <Field.Label>
          <Text type="secondary">Заказчик</Text>
          <Tooltip title="Добавить нового заказчика">
            <CreateColorButton
              size="small"
              type="text"
              icon={<PlusOutlined />}
              onCreated={(customer) => {
                return handleUpdate('customer', customer);
              }}
            />
          </Tooltip>
        </Field.Label>
        <Field.Value>
          <Editable
            className={styles.editable}
            loading={loadings['customer']}
            onSave={(name, value) => {
              return handleUpdate(name, value ? customers[value] : undefined);
            }}
            defaultValue={currentGroup.customer?.id}
            block
            confirmOnBlur
            name="customer"
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
            <Text className={styles.title}>
              {currentGroup.customer?.name || 'Выберите заказчика'}
            </Text>
          </Editable>
        </Field.Value>
      </Field>
    </div>
  );
};
