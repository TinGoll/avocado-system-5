import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Skeleton, Typography } from 'antd';
import type { FC } from 'react';

import { FacadePanelSelect, type FacadePanel } from '@entities/facade-panel';
import { useFacadePanelMap } from '@entities/facade-panel/api/facadePanel.api';
import { useOrderStore } from '@entities/order';
import { CreateFacadePanelButton } from '@features/create-facade-panel';
import { Editable } from '@shared/ui/editable';
import { Field } from '@shared/ui/Field';

import { useOptimisticOrderUpdate } from '../hooks/useOptimisticOrderUpdate';

import { styles } from './styles';

const { Text } = Typography;

export const FacadePanelField: FC = () => {
  const { currentOrder } = useOrderStore();
  const { map: panels, isLoading } = useFacadePanelMap();
  const { updateCharacteristic, isMutating } = useOptimisticOrderUpdate();

  const handleUpdate = (item?: FacadePanel) => {
    const updateItem = item ?? ({} as FacadePanel);
    updateCharacteristic('panel', updateItem);
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
    currentOrder?.characteristics?.panel === undefined
  ) {
    return null;
  }

  return (
    <Field>
      <Field.Label>
        <Text type="secondary">Филёнка</Text>
        <div className={styles.actions}>
          <CreateFacadePanelButton
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
          name="panel"
          className={styles.editable}
          loading={isMutating}
          onSave={(_, value) => {
            return handleUpdate(value ? panels?.[value] : undefined);
          }}
          defaultValue={currentOrder?.characteristics?.panel?.name}
          block
          confirmOnBlur
          control={(props) => (
            <FacadePanelSelect
              {...props}
              className={styles.input}
              size="small"
              variant="borderless"
              defaultOpen
              autoFocus
            />
          )}
        >
          {currentOrder?.characteristics?.panel?.name ? (
            <Text className={styles.title} type="success">
              {currentOrder?.characteristics?.panel?.name}
            </Text>
          ) : (
            <Text type="secondary">Выбери филёнку</Text>
          )}
        </Editable>
      </Field.Value>
    </Field>
  );
};
