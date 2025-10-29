import { css } from '@emotion/css';
import { App, Button, Form, Input, Radio, type FormProps } from 'antd';
import type { FC } from 'react';

import { COLOR_TYPE, colorTypeNames, type Color } from '@entities/color';

import { useCreateColor } from '../hooks/useCreateColor';
import type { ColorFieldType } from '../model/types';

const styles = {
  form: css`
    box-sizing: border-box;
    & .ant-form-item {
      margin-bottom: 16px;
    }
  `,
  formActions: css`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
    padding-top: 16px;
  `,
};

type Props = {
  onCreated?: (color: Color) => void;
  onCancel?: () => void;
};

export const CreateForm: FC<Props> = ({ onCreated, onCancel }) => {
  const [form] = Form.useForm<ColorFieldType>();
  const { trigger, isMutating } = useCreateColor();
  const { notification } = App.useApp();

  const handleFinish: FormProps<ColorFieldType>['onFinish'] = (values) => {
    trigger({
      ...values,
    }).then((data) => {
      onCreated?.(data);
      notification.success({
        message: 'Цвет успешно добавлен',
      });
      form.resetFields();
    });
  };

  const handleCancel = () => {
    onCancel?.();
    form.resetFields();
  };

  return (
    <Form
      name="create_color_form"
      form={form}
      className={styles.form}
      layout="vertical"
      initialValues={{ type: COLOR_TYPE.ENAMEL }}
      onFinish={handleFinish}
      autoComplete="off"
    >
      <Form.Item<ColorFieldType>
        label="Название"
        name="name"
        tooltip="Название красителя должно быть уникальным"
        rules={[{ required: true, message: 'Введи название цвета' }]}
      >
        <Input />
      </Form.Item>

      <Form.Item<ColorFieldType>
        label="Тип красителя"
        name="type"
        tooltip="Выберите тип красителя из предложенных  вариантов."
        rules={[{ required: true, message: 'Выбери тип красителя' }]}
      >
        <Radio.Group block optionType="button" buttonStyle="solid">
          <Radio.Button value={COLOR_TYPE.ENAMEL}>
            {colorTypeNames[COLOR_TYPE.ENAMEL]}
          </Radio.Button>
          <Radio.Button value={COLOR_TYPE.STAIN}>
            {colorTypeNames[COLOR_TYPE.STAIN]}
          </Radio.Button>
        </Radio.Group>
      </Form.Item>
      <div className={styles.formActions}>
        <Button variant="solid" color="danger" onClick={handleCancel}>
          Отмена
        </Button>
        <Button type="primary" htmlType="submit" loading={isMutating}>
          Добавить
        </Button>
      </div>
    </Form>
  );
};
