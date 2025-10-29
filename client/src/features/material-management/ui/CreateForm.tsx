import { css } from '@emotion/css';
import {
  App,
  Button,
  Divider,
  Form,
  Input,
  Radio,
  Skeleton,
  type FormProps,
} from 'antd';
import { type FC } from 'react';

import {
  MATERIAL_TYPE,
  materialTypeMap,
  type Material,
} from '@entities/material';

import { useCreateMaterial } from '../hooks/useCreateMaterial';
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
  onCreated?: (material: Material) => void;
  onCancel?: () => void;
};

export const CreateForm: FC<Props> = ({ onCancel, onCreated }) => {
  const [form] = Form.useForm<FieldType>();
  const { isMutating, trigger, isLoading } = useCreateMaterial();
  const { notification } = App.useApp();

  const handleFinish: FormProps<FieldType>['onFinish'] = (values) => {
    trigger({
      ...values,
    }).then((data) => {
      onCreated?.(data);
      notification.success({
        message: 'Материал успешно добавлен',
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
        name="create_material_form"
        form={form}
        className={styles.form}
        layout="vertical"
        initialValues={{ type: MATERIAL_TYPE.HARDWOOD }}
        onFinish={handleFinish}
        autoComplete="off"
      >
        <Form.Item<FieldType>
          label="Название"
          name="name"
          tooltip="Название материала должно быть уникальным"
          rules={[{ required: true, message: 'Введи название материала' }]}
        >
          <Input />
        </Form.Item>
        <Form.Item<FieldType>
          label="Тип материала"
          name="type"
          tooltip="Выберите тип материала из предложенных  вариантов."
          rules={[{ required: true, message: 'Выбери тип материала' }]}
        >
          <Radio.Group block optionType="button" buttonStyle="solid">
            <Radio.Button value={MATERIAL_TYPE.HARDWOOD}>
              {materialTypeMap[MATERIAL_TYPE.HARDWOOD]}
            </Radio.Button>
            <Radio.Button value={MATERIAL_TYPE.SOFTWOOD}>
              {materialTypeMap[MATERIAL_TYPE.SOFTWOOD]}
            </Radio.Button>
            <Radio.Button value={MATERIAL_TYPE.MDF}>
              {materialTypeMap[MATERIAL_TYPE.MDF]}
            </Radio.Button>
          </Radio.Group>
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
