import { CloseOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Select, Typography } from 'antd';
import { type FC } from 'react';

import { useOrderStore, type OrderCharacteristics } from '@entities/order';
import { Editable } from '@shared/ui/editable';
import { Field } from '@shared/ui/Field';

import { useOptimisticOrderUpdate } from '../hooks/useOptimisticOrderUpdate';

import { styles } from './styles';

const options = [
  { label: 'Да', value: 'Да' },
  { label: 'Нет', value: 'Нет' },
];

type Characteristic = 'thermalSeam' | 'drilling';

type Props = {
  characteristic: Characteristic;
  label: string;
};

export const YesNoCharacteristicField: FC<Props> = ({
  characteristic,
  label,
}) => {
  const { currentOrder } = useOrderStore();
  const { updateCharacteristic, removeCharacteristic, isMutating } =
    useOptimisticOrderUpdate();
  const value = currentOrder?.characteristics?.[characteristic];

  if (value === undefined) {
    return null;
  }

  return (
    <Field>
      <Field.Label>
        <Typography.Text type="secondary">{label}</Typography.Text>
        <Popconfirm
          onConfirm={() => removeCharacteristic(characteristic)}
          title="Удалить это поле?"
          okText="Да"
          cancelText="Нет"
          placement="rightTop"
        >
          <Button
            aria-label={`Удалить поле ${label}`}
            type="text"
            size="small"
            icon={<CloseOutlined />}
            loading={isMutating}
          />
        </Popconfirm>
      </Field.Label>
      <Field.Value>
        <Editable<OrderCharacteristics[Characteristic]>
          name={characteristic}
          className={styles.editable}
          loading={isMutating}
          onSave={(_, nextValue) =>
            updateCharacteristic(characteristic, nextValue ?? 'Нет')
          }
          defaultValue={value}
          block
          confirmOnBlur
          control={(props) => (
            <Select
              {...props}
              className={styles.input}
              size="small"
              variant="borderless"
              options={options}
              defaultOpen
              autoFocus
            />
          )}
        >
          <Typography.Text className={styles.title} type="success">
            {value}
          </Typography.Text>
        </Editable>
      </Field.Value>
    </Field>
  );
};
