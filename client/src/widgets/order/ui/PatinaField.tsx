import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Skeleton, Typography } from 'antd';
import type { FC } from 'react';

import { useOrderStore } from '@entities/order';
import { PatinaSelect, usePatinaMap, type Patina } from '@entities/patina';
import { CreatePatinaButton } from '@features/create-patina';
import { useOptimisticOrderUpdate } from '@features/edit-order-group';
import { Editable } from '@shared/ui/editable';
import { Field } from '@shared/ui/Field';

import { styles } from './styles';

const { Text } = Typography;

export const PatinaField: FC = () => {
  const { currentOrder } = useOrderStore();
  const { map: patinas, isLoading } = usePatinaMap();
  const { updateCharacteristic, isMutating } = useOptimisticOrderUpdate();

  const handleUpdate = (item?: Patina) => {
    const updateItem = item ?? ({} as Patina);
    updateCharacteristic('patina', updateItem);
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
    currentOrder?.characteristics?.patina === undefined
  ) {
    return null;
  }

  return (
    <Field>
      <Field.Label>
        <Text type="secondary">Патина</Text>
        <div className={styles.actions}>
          <CreatePatinaButton
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
          name="patina"
          className={styles.editable}
          loading={isMutating}
          onSave={(_, value) => {
            return handleUpdate(value ? patinas?.[value] : undefined);
          }}
          defaultValue={currentOrder?.characteristics?.patina?.name}
          block
          confirmOnBlur
          control={(props) => (
            <PatinaSelect
              {...props}
              className={styles.input}
              size="small"
              variant="borderless"
              defaultOpen
              autoFocus
            />
          )}
        >
          {currentOrder?.characteristics?.patina?.name ? (
            <Text className={styles.title} type="success">
              {currentOrder?.characteristics?.patina?.name}
            </Text>
          ) : (
            <Text type="secondary">Выбери патину</Text>
          )}
        </Editable>
      </Field.Value>
    </Field>
  );
};
