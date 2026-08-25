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

import { getPreviewError } from '../api/preview-production-operation';
import { useCreateProductionOperations } from '../hooks/useCreateProductionOperations';
import type { FieldType } from '../model/create-production-operation';

import { ProductionOperationEditorFields } from './ProductionOperationEditorFields';

const styles = {
  form: css`
    box-sizing: border-box;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
    width: 100%;

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
  formBody: css`
    min-height: 0;
    overflow-y: auto;
    padding-right: 8px;
  `,
  formActions: css`
    flex: none;
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

  const handleFinish: FormProps<FieldType>['onFinish'] = async (values) => {
    try {
      const data = await trigger({
        name: values.name,
        calculationMethod: values.calculationMethod,
        calculationFormula: values.calculationFormula,
        displayNameTemplate: values.displayNameTemplate,
        costPerUnit: values.costPerUnit,
      });
      onCreated?.(data);
      notification.success({
        title: 'Новая работа успешно добавлена',
      });
      form.resetFields();
    } catch (error) {
      const details = getPreviewError(error);
      if (
        details.field === 'calculationFormula' ||
        details.field === 'displayNameTemplate'
      ) {
        form.setFields([
          {
            name: details.field,
            errors: [details.message ?? 'Проверьте значение'],
          },
        ]);
      }
    }
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
          costPerUnit: 100,
          calculationMethod: CALCULATION_METHOD.PER_ITEM,
          calculationFormula: 'item.quantity',
          displayNameTemplate: 'Количество: {{ item.quantity }} шт.',
          preview: {
            width: 500,
            height: 860,
            thickness: 20,
            quantity: 1,
          },
        }}
        onFinish={handleFinish}
        autoComplete="off"
      >
        <div className={styles.formBody}>
          <Form.Item<FieldType>
            label="Название"
            name="name"
            tooltip="Название работы должно быть уникальным"
            rules={[{ required: true, message: 'Введи название работы' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item<FieldType>
            label="Стоимость за единицу"
            name="costPerUnit"
            tooltip="Введите цену за еденицу"
            rules={[{ required: true, message: 'Введите цену за еденицу' }]}
          >
            <InputNumber className="input-number" min={0.01} precision={2} />
          </Form.Item>
          <Divider className="form-divider" />
          <Form.Item<FieldType>
            label="Единица расчёта"
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
          <ProductionOperationEditorFields form={form} />
        </div>

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
