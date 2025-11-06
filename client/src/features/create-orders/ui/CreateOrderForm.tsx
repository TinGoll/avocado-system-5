import { css } from '@emotion/css';
import {
  Button,
  DatePicker,
  Form,
  Input,
  Select,
  Typography,
  type FormProps,
} from 'antd';
import dayjs from 'dayjs';
import type { FC } from 'react';

import { CustomerSelect, useCustomerMap } from '@entities/customer';
import { useOrderStore, type OrderGroup } from '@entities/order';
import { orderTemplates } from '@entities/order-template';
import { DATE_DEFAULT_FORMAT } from '@shared/utils/dateHelpers';

import type { FieldType } from '../model/types';
import { useCreateOrder } from '../model/useCreateOrder';
const styles = {
  templates: css`
    & .ant-form-item {
      margin: 0;
    }

    & .template-description {
      padding: 0 16px;
    }
    & .ant-typography {
      font-size: 14px;
    }
    margin-bottom: 24px;
  `,
  actions: css`
    display: flex;
    gap: 16px;
    justify-content: flex-end;
  `,
};

const { Text } = Typography;

type Props = {
  onCreated?: (color: OrderGroup) => void;
  onCancel?: () => void;
};

export const CreateOrderForm: FC<Props> = ({ onCancel, onCreated }) => {
  const [form] = Form.useForm();
  const { handleCreate } = useCreateOrder();
  const { isCreating } = useOrderStore();
  const { customers } = useCustomerMap();

  const onFinish: FormProps<FieldType>['onFinish'] = async ({
    customerID,
    startedAt,
    templateId,
    ...values
  }) => {
    const template = orderTemplates.find((t) => t.id === templateId);
    if (!template) {
      return;
    }

    const characteristics = template.getDefaultCharacteristics();
    const { group } = await handleCreate({
      customer: customers[customerID],
      startedAt: startedAt.startOf('day').toDate(),
      characteristics,
      ...values,
    });

    form.resetFields();
    onCreated?.(group);
  };

  return (
    <Form
      form={form}
      onFinish={onFinish}
      layout="vertical"
      autoComplete="off"
      initialValues={{
        startedAt: dayjs(),
        templateId: 'all',
      }}
    >
      <Form.Item<FieldType>
        name="orderNumber"
        label="Номер заказ (название)"
        tooltip={
          <>
            Номер заказа обычно предоставляет заказчик.
            <br />
            Это может быть как текстовый, так и цифровой идентификатор заказа.
          </>
        }
        rules={[{ required: true }]}
      >
        <Input placeholder="Название заказа" />
      </Form.Item>
      <Form.Item<FieldType>
        name="customerID"
        label="Заказчик"
        tooltip={
          <>
            Выбери заказчика из списка. Если нужного заказчика нет, его можно
            добавить на странице создания клиента. <br />
            Можно оставить пустым и выбрать позже.
          </>
        }
      >
        <CustomerSelect allowClear />
      </Form.Item>
      <Form.Item<FieldType>
        name="startedAt"
        label="Дата начала"
        tooltip={
          <>
            Укажи дату регистрации заказа - от неё будет рассчитываться срок
            сдачи.
          </>
        }
      >
        <DatePicker format={{ format: DATE_DEFAULT_FORMAT }} />
      </Form.Item>
      <div className={styles.templates}>
        <Form.Item
          name="templateId"
          label="Шаблон заказа"
          tooltip={
            <>
              Шаблон заказа позволяет задать основные поля - например, цвет,
              материал и другие. <br />
              Это не окончательное решение: поля можно изменить точечно на
              странице редактирования заказа.
            </>
          }
          rules={[{ required: true }]}
        >
          <Select
            placeholder="Выберите шаблон заказа"
            options={orderTemplates.map((t) => ({
              label: t.name,
              value: t.id,
            }))}
          />
        </Form.Item>

        <Form.Item
          shouldUpdate={(prev, next) => prev.templateId !== next.templateId}
        >
          {({ getFieldValue }) => {
            const template = orderTemplates.find(
              (t) => t.id === getFieldValue('templateId'),
            );
            return template ? (
              <div className="template-description">
                <Text type="secondary">{template.description}</Text>
              </div>
            ) : null;
          }}
        </Form.Item>
      </div>

      <div className={styles.actions}>
        <Button onClick={onCancel}>Отмена</Button>
        <Button type="primary" htmlType="submit" loading={isCreating}>
          Создать заказ
        </Button>
      </div>
    </Form>
  );
};
