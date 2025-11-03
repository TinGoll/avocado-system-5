import { css } from '@emotion/css';
import {
  App,
  Button,
  Divider,
  Form,
  Input,
  Skeleton,
  type FormProps,
} from 'antd';
import { type FC } from 'react';

import type { Patina } from '@entities/patina';

import { useCreatePatina } from '../hooks/useCreatePatina';
import type { FieldType } from '../model/types';

const styles = {
  form: css`
    box-sizing: border-box;
    & .ant-form-item {
      margin-bottom: 16px;
    }

    & .form-divider {
      margin: 8px 0;
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
  onCreated?: (patina: Patina) => void;
  onCancel?: () => void;
};

export const CreateForm: FC<Props> = ({ onCancel, onCreated }) => {
  const [form] = Form.useForm<FieldType>();
  const { isMutating, trigger, isLoading } = useCreatePatina();
  const { notification } = App.useApp();

  const handleFinish: FormProps<FieldType>['onFinish'] = (values) => {
    trigger({
      ...values,
    }).then((data) => {
      onCreated?.(data);
      notification.success({
        message: 'Патина успешно добавлена',
      });
      form.resetFields();
    });
  };

  const handleCancel = () => {
    onCancel?.();
    form.resetFields();
  };
  return (
    <Skeleton loading={isLoading} active>
      <Form
        name="create_patina_form"
        form={form}
        className={styles.form}
        layout="vertical"
        initialValues={{}}
        onFinish={handleFinish}
        autoComplete="off"
      >
        <Form.Item<FieldType>
          label="Название"
          name="name"
          tooltip="Название патины должно быть уникальным"
          rules={[{ required: true, message: 'Введи название патины' }]}
        >
          <Input />
        </Form.Item>
        <Divider className="form-divider" />
        <div className={styles.formActions}>
          <Button variant="solid" color="danger" onClick={handleCancel}>
            Отмена
          </Button>
          <Button type="primary" htmlType="submit" loading={isMutating}>
            Добавить
          </Button>
        </div>
      </Form>
    </Skeleton>
  );
};
