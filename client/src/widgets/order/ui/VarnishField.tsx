import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Skeleton, Typography } from 'antd';
import type { FC } from 'react';

import { useOrderStore } from '@entities/order';
import { useVarnishMap, VarnishSelect, type Varnish } from '@entities/varnish';
import { CreateVarnishButton } from '@features/create-varnish';
import { useOptimisticOrderUpdate } from '@features/edit-order-group';
import { Editable } from '@shared/ui/editable';
import { Field } from '@shared/ui/Field';

import { styles } from './styles';

const { Text } = Typography;

export const VarnishField: FC = () => {
  const { currentOrder } = useOrderStore();
  const { map: varnishes, isLoading } = useVarnishMap();
  const { updateCharacteristic, isMutating } = useOptimisticOrderUpdate();

  const handleUpdate = (item?: Varnish) => {
    const updateItem = item ?? ({} as Varnish);
    updateCharacteristic('varnish', updateItem);
  };

  if (isLoading) {
    return (
      <Field>
        <Field.Label>
          <Skeleton.Input block active size="small" />
        </Field.Label>
        <Field.Value>
          <Skeleton.Input block active size="small" />
        </Field.Value>
      </Field>
    );
  }

  if (
    !isLoading &&
    currentOrder?.characteristics &&
    currentOrder?.characteristics?.varnish === undefined
  ) {
    return null;
  }

  return (
    <Field>
      <Field.Label>
        <Text type="secondary">Лак</Text>
        <div className={styles.actions}>
          <CreateVarnishButton
            onCreated={(item) => {
              handleUpdate(item);
            }}
            type="text"
            size="small"
            icon={<PlusOutlined />}
          />
          <Popconfirm
            title="Удалить это поле?"
            description={
              <Text type="secondary">
                Можно добавить снова <br />в панели заказа
              </Text>
            }
            okText="Да"
            cancelText="Нет"
            placement="rightTop"
          >
            <Button type="text" size="small" icon={<CloseOutlined />} />
          </Popconfirm>
        </div>
      </Field.Label>
      <Field.Value>
        <Editable
          name="varnish"
          className={styles.editable}
          loading={isMutating}
          onSave={(_, value) => {
            return handleUpdate(value ? varnishes?.[value] : undefined);
          }}
          defaultValue={currentOrder?.characteristics?.varnish?.name}
          block
          confirmOnBlur
          control={(props) => (
            <VarnishSelect
              {...props}
              className={styles.input}
              size="small"
              variant="borderless"
              defaultOpen
              autoFocus
            />
          )}
        >
          {currentOrder?.characteristics?.varnish?.name ? (
            <Text className={styles.title} type="success">
              {currentOrder?.characteristics?.varnish?.name}
            </Text>
          ) : (
            <Text type="secondary">Выбери лак</Text>
          )}
        </Editable>
      </Field.Value>
    </Field>
  );
};
