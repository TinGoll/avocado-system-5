import { PlusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import { Button, Form, Input, InputNumber } from 'antd';
import type { FC } from 'react';

const styles = {
  container: css`
    border-left: 1px solid var(--app-devider-color);
    border-right: 1px solid var(--app-devider-color);
    border-bottom: 1px solid var(--app-devider-color);
    padding: 8px;
    display: flex;
    gap: 4px;
  `,
  form: css`
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    & .ant-form-item {
      margin: 0;
    }
  `,
  button: css`
    display: flex;
    align-items: flex-end;
    justify-content: center;
  `,
  description: css`
    flex: 1;
  `,
};

export const AddOrderItemForm: FC = () => {
  return (
    <div className={styles.container}>
      <Button icon={<PlusOutlined />} type="text" />
      <Form
        className={styles.form}
        name="item-creator-form"
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="horizontal"
          // label="Номенклатура"
          rules={[{ required: true, message: '' }]}
        >
          <Input variant="underlined" placeholder="Номенклатура" />
        </Form.Item>
        <Form.Item name="horizontal">
          <InputNumber variant="underlined" placeholder="Высота" />
        </Form.Item>
        <Form.Item name="horizontal">
          <InputNumber variant="underlined" placeholder="Ширина" />
        </Form.Item>
        <Form.Item name="horizontal" rules={[{ required: true, message: '' }]}>
          <InputNumber variant="underlined" placeholder="Количество" />
        </Form.Item>
        <Form.Item className={styles.description} name="horizontal">
          <Input variant="underlined" placeholder="Комментарий" />
        </Form.Item>

        <Form.Item name="horizontal" className={styles.button}>
          <Button
            variant="solid"
            color="purple"
            htmlType="submit"
            icon={<PlusCircleOutlined />}
          >
            Добавить
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};
