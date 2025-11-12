import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Skeleton, Typography } from 'antd';
import type { FC } from 'react';

import { ColorSelect, useColorMap, type Color } from '@entities/color';
import { useOrderStore } from '@entities/order';
import { CreateColorButton } from '@features/create-color';
import { Field } from '@shared/ui';
import { Editable } from '@shared/ui/editable';

import { useOptimisticOrderUpdate } from '../hooks/useOptimisticOrderUpdate';

import { styles } from './styles';

const { Text } = Typography;

export const ColorField: FC = () => {
  const { currentOrder } = useOrderStore();
  const { map: colors, isLoading } = useColorMap();
  const { updateCharacteristic, isMutating } = useOptimisticOrderUpdate();

  const handleUpdate = (item?: Color) => {
    const updateItem = item ?? ({} as Color);
    updateCharacteristic('color', updateItem);
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
    currentOrder?.characteristics?.color === undefined
  ) {
    return null;
  }

  return (
    <Field>
      <Field.Label>
        <Text type="secondary">Цвет</Text>
        <div className={styles.actions}>
          <CreateColorButton
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
          name="color"
          className={styles.editable}
          loading={isMutating}
          onSave={(_, value) => {
            return handleUpdate(value ? colors?.[value] : undefined);
          }}
          defaultValue={currentOrder?.characteristics?.color?.name}
          block
          confirmOnBlur
          control={(props) => (
            <ColorSelect
              {...props}
              className={styles.input}
              size="small"
              variant="borderless"
              defaultOpen
              autoFocus
            />
          )}
        >
          {currentOrder?.characteristics?.color?.name ? (
            <Text className={styles.title} type="success">
              {currentOrder?.characteristics?.color?.name}
            </Text>
          ) : (
            <Text type="secondary">Выбери цвет</Text>
          )}
        </Editable>
      </Field.Value>
    </Field>
  );
};
