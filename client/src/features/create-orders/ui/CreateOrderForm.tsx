import { Button, DatePicker, Form, Input, Select, type FormProps } from 'antd';
import dayjs from 'dayjs';
import type { FC } from 'react';

import { useOrderStore, type Customer } from '@entities/order';
import { orderTemplates } from '@entities/order-template';

import type { FieldType } from '../model/types';
import { useCreateOrder } from '../model/useCreateOrder';

const mockCustomers: Record<string, Customer> = {
  ['customer-ID']: {
    id: 'customer-ID',
    name: 'Customer',
    level: 'bronze',
  },
};

export const CreateOrderForm: FC = () => {
  const [form] = Form.useForm();
  const { handleCreate } = useCreateOrder();
  const { isCreating } = useOrderStore();

  const onFinish: FormProps<FieldType>['onFinish'] = async ({
    customerID,
    startedAt,
    templateId,
    ...values
  }) => {
    const template = orderTemplates.find((t) => t.id === templateId);
    if (!template) return;

    const characteristics = template.getDefaultCharacteristics();

    await handleCreate({
      customer: mockCustomers[customerID],
      startedAt: startedAt.toDate(),
      characteristics,
      ...values,
    });
  };

  return (
    <Form
      form={form}
      onFinish={onFinish}
      layout="vertical"
      autoComplete="off"
      initialValues={{
        startedAt: dayjs(),
      }}
    >
      <Form.Item<FieldType>
        name="orderNumber"
        label="Номер заказ (название)"
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>
      <Form.Item<FieldType>
        name="customerID"
        label="Заказчик"
        rules={[{ required: true }]}
      >
        <Select
          placeholder="Выберите заказчика"
          options={[
            {
              label: 'Customer',
              value: 'customer-ID',
            },
          ]}
        />
      </Form.Item>
      <Form.Item<FieldType> name="startedAt" label="Дата начала">
        <DatePicker format={{ format: 'DD.MM.YYYY' }} />
      </Form.Item>

      <Form.Item
        name="templateId"
        label="Шаблон заказа"
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
            <div
              style={{
                padding: '0 12px',
              }}
            >
              {template.description}
            </div>
          ) : null;
        }}
      </Form.Item>

      <Button type="primary" htmlType="submit" loading={isCreating}>
        Создать заказ
      </Button>
    </Form>
  );
};
