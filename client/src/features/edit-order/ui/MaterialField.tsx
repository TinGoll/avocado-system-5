import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Skeleton, Typography } from 'antd';
import type { FC } from 'react';

import {
  MaterialSelect,
  useMaterialMap,
  type Material,
} from '@entities/material';
import { useOrderStore } from '@entities/order';
import { CreateMaterialButton } from '@features/create-material';
import { Editable } from '@shared/ui/editable';
import { Field } from '@shared/ui/Field';

import { useOptimisticOrderUpdate } from '../hooks/useOptimisticOrderUpdate';

import { styles } from './styles';

const { Text } = Typography;

export const MaterialField: FC = () => {
  const { currentOrder } = useOrderStore();
  const { materials, isLoading } = useMaterialMap();
  const { updateCharacteristic, isMutating } = useOptimisticOrderUpdate();

  const handleUpdate = (material?: Material) => {
    const updateMaterial = material ?? ({} as Material);
    updateCharacteristic('material', updateMaterial);
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
    currentOrder?.characteristics?.material === undefined
  ) {
    return null;
  }

  return (
    <Field>
      <Field.Label>
        <Text type="secondary">Материал</Text>
        <div className={styles.actions}>
          <CreateMaterialButton
            onCreated={(material) => {
              handleUpdate(material);
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
          name="material"
          className={styles.editable}
          loading={isMutating}
          onSave={(_, value) => {
            return handleUpdate(value ? materials?.[value] : undefined);
          }}
          defaultValue={currentOrder?.characteristics?.material?.name}
          block
          confirmOnBlur
          control={(props) => (
            <MaterialSelect
              {...props}
              className={styles.input}
              size="small"
              variant="borderless"
              defaultOpen
              autoFocus
            />
          )}
        >
          {currentOrder?.characteristics?.material?.name ? (
            <Text className={styles.title} type="success">
              {currentOrder?.characteristics?.material?.name}
            </Text>
          ) : (
            <Text type="secondary">Выбери материал</Text>
          )}
        </Editable>
      </Field.Value>
    </Field>
  );
};
