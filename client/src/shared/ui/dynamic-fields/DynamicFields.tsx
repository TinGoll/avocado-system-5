import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import { Button, Form, Input, InputNumber, Switch } from 'antd';
import type { FC } from 'react';

import type { DynamicFieldValue } from './dynamic-field';

const styles = {
  row: css`
    display: grid;
    grid-template-columns: minmax(140px, 1fr) minmax(180px, 2fr) 32px;
    gap: 8px;
    margin-bottom: 8px;
  `,
};

const DynamicValueInput: FC<{
  value?: DynamicFieldValue;
  onChange?: (value: DynamicFieldValue) => void;
}> = ({ value, onChange }) => {
  if (typeof value === 'boolean') {
    return <Switch checked={value} onChange={onChange} />;
  }

  if (typeof value === 'number') {
    return (
      <InputNumber
        value={value}
        style={{ width: '100%' }}
        onChange={(nextValue) => onChange?.(nextValue ?? 0)}
      />
    );
  }

  return (
    <Input value={value} onChange={(event) => onChange?.(event.target.value)} />
  );
};

type Props = {
  name: string;
  addButtonText?: string;
};

export const DynamicFields: FC<Props> = ({
  name,
  addButtonText = 'Добавить поле',
}) => (
  <Form.List name={name}>
    {(fields, { add, remove }) => (
      <>
        {fields.map(({ key, name: fieldName, ...restField }) => (
          <div className={styles.row} key={key}>
            <Form.Item {...restField} name={[fieldName, 'key']} noStyle>
              <Input placeholder="Название" />
            </Form.Item>
            <Form.Item {...restField} name={[fieldName, 'value']} noStyle>
              <DynamicValueInput />
            </Form.Item>
            <Button
              aria-label="Удалить поле"
              danger
              type="text"
              icon={<DeleteOutlined />}
              onClick={() => remove(fieldName)}
            />
          </div>
        ))}
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => add({ key: '', value: '' })}
        >
          {addButtonText}
        </Button>
      </>
    )}
  </Form.List>
);
