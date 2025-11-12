import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Skeleton, Typography } from 'antd';
import type { FC } from 'react';

import {
  FacadeProfileSelect,
  useFacadeProfileMap,
  type FacadeProfile,
} from '@entities/facade-profile';
import { useOrderStore } from '@entities/order';
import { CreateFacadeProfileButton } from '@features/create-facade-profile';
import { Editable } from '@shared/ui/editable';
import { Field } from '@shared/ui/Field';

import { useOptimisticOrderUpdate } from '../hooks/useOptimisticOrderUpdate';

import { styles } from './styles';

const { Text } = Typography;

export const FacadeProfileField: FC = () => {
  const { currentOrder } = useOrderStore();
  const { map: profiles, isLoading } = useFacadeProfileMap();
  const { updateCharacteristic, isMutating } = useOptimisticOrderUpdate();

  const handleUpdate = (item?: FacadeProfile) => {
    const updateItem = item ?? ({} as FacadeProfile);
    updateCharacteristic('profile', updateItem);
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
    currentOrder?.characteristics?.profile === undefined
  ) {
    return null;
  }

  return (
    <Field>
      <Field.Label>
        <Text type="secondary">Профиль</Text>
        <div className={styles.actions}>
          <CreateFacadeProfileButton
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
          name="profile"
          className={styles.editable}
          loading={isMutating}
          onSave={(_, value) => {
            return handleUpdate(value ? profiles?.[value] : undefined);
          }}
          defaultValue={currentOrder?.characteristics?.profile?.name}
          block
          confirmOnBlur
          control={(props) => (
            <FacadeProfileSelect
              {...props}
              className={styles.input}
              size="small"
              variant="borderless"
              defaultOpen
              autoFocus
            />
          )}
        >
          {currentOrder?.characteristics?.profile?.name ? (
            <Text className={styles.title} type="success">
              {currentOrder?.characteristics?.profile?.name}
            </Text>
          ) : (
            <Text type="secondary">Выбери профиль</Text>
          )}
        </Editable>
      </Field.Value>
    </Field>
  );
};
