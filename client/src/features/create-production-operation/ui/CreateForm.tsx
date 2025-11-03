import { css } from '@emotion/css';
import {
  App,
  Button,
  Divider,
  Form,
  Input,
  InputNumber,
  Radio,
  Skeleton,
  type FormProps,
} from 'antd';
import { type FC } from 'react';

import {
  CALCULATION_METHOD,
  calculationMethodNameMap,
  type ProductionOperation,
} from '@entities/production-operation';

import { useCreateProductionOperations } from '../hooks/useCreateProductionOperations';
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

    & .input-number {
      min-width: 140px;
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
  onCreated?: (operation: ProductionOperation) => void;
  onCancel?: () => void;
};

export const CreateForm: FC<Props> = ({ onCancel, onCreated }) => {
  const [form] = Form.useForm<FieldType>();
  const { isMutating, trigger, isLoading } = useCreateProductionOperations();
  const { notification } = App.useApp();

  const handleFinish: FormProps<FieldType>['onFinish'] = (values) => {
    trigger({
      ...values,
    }).then((data) => {
      onCreated?.(data);
      notification.success({
        message: 'Новая работа успешно добавлена',
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
        name="create_production_operation_form"
        form={form}
        className={styles.form}
        layout="vertical"
        initialValues={{
          costPerUnit: 0,
          calculationMethod: CALCULATION_METHOD.PER_ITEM,
        }}
        onFinish={handleFinish}
        autoComplete="off"
      >
        <Form.Item<FieldType>
          label="Название"
          name="name"
          tooltip="Название работы должно быть уникальным"
          rules={[{ required: true, message: 'Введи название работы' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item<FieldType>
          label="Цена"
          name="costPerUnit"
          tooltip="Введите цену за еденицу"
          rules={[{ required: true, message: 'Введите цену за еденицу' }]}
        >
          <InputNumber className="input-number" />
        </Form.Item>
        <Divider className="form-divider" />
        <Form.Item<FieldType>
          label="Тип расчета"
          name="calculationMethod"
          tooltip="Выберите тип расчета из предложенных  вариантов."
          rules={[{ required: true, message: 'Выбери тип расчета' }]}
        >
          <Radio.Group block optionType="button" buttonStyle="solid">
            <Radio.Button value={CALCULATION_METHOD.PER_ITEM}>
              {calculationMethodNameMap[CALCULATION_METHOD.PER_ITEM]}
            </Radio.Button>
            <Radio.Button value={CALCULATION_METHOD.AREA}>
              {calculationMethodNameMap[CALCULATION_METHOD.AREA]}
            </Radio.Button>
            <Radio.Button value={CALCULATION_METHOD.VOLUME}>
              {calculationMethodNameMap[CALCULATION_METHOD.VOLUME]}
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
