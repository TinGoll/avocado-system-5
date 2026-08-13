import { css } from '@emotion/css';
import { Form, InputNumber, Modal, Radio, Select } from 'antd';
import { useEffect, type FC } from 'react';

import type { OrderItem } from '@entities/order';
import {
  CUSTOMER_PRICING_METHOD,
  type CustomerPricingMethod,
  type ProductTemplate,
} from '@entities/product';
import {
  DynamicFields,
  dynamicFieldsToObject,
  objectToDynamicFields,
  type DynamicField,
} from '@shared/ui/dynamic-fields';

import type { UpdateOrderItemDto } from './model/useOrderItems';

const styles = {
  sectionTitle: css`
    margin: 16px 0 8px;
    font-weight: 600;
  `,
};

type FormValues = {
  templateId: string;
  quantity: number;
  customerPricingMethod: CustomerPricingMethod;
  attributes: DynamicField[];
  characteristics: DynamicField[];
};

type Props = {
  item?: OrderItem;
  open: boolean;
  templates: ProductTemplate[];
  loading: boolean;
  onCancel: () => void;
  onSave: (itemID: string, updates: UpdateOrderItemDto) => Promise<void>;
};

export const EditOrderItemModal: FC<Props> = ({
  item,
  open,
  templates,
  loading,
  onCancel,
  onSave,
}) => {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (!open || !item) return;
    form.setFieldsValue({
      templateId: item.template.id,
      quantity: item.quantity,
      customerPricingMethod: item.snapshot.customerPricingMethod,
      attributes: objectToDynamicFields(item.snapshot?.attributes),
      characteristics: objectToDynamicFields(item.characteristics),
    });
  }, [form, item, open]);

  const handleFinish = async (values: FormValues) => {
    if (!item) return;
    await onSave(item.id, {
      templateId: values.templateId,
      quantity: values.quantity,
      customerPricingMethod: values.customerPricingMethod,
      attributes: dynamicFieldsToObject(values.attributes),
      characteristics: dynamicFieldsToObject(values.characteristics),
    });
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(({ id }) => id === templateId);
    if (!template) return;

    form.setFieldsValue({
      customerPricingMethod: template.customerPricingMethod,
      attributes: objectToDynamicFields(template.attributes),
      characteristics: objectToDynamicFields({
        ...template.defaultCharacteristics,
        ...dynamicFieldsToObject(form.getFieldValue('characteristics')),
      }),
    });
  };

  return (
    <Modal
      title="Редактирование элемента"
      open={open}
      okText="Сохранить"
      cancelText="Отмена"
      confirmLoading={loading}
      destroyOnHidden
      onCancel={onCancel}
      onOk={() => form.submit()}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          label="Номенклатура"
          name="templateId"
          rules={[{ required: true, message: 'Выберите номенклатуру' }]}
        >
          <Select
            showSearch
            optionFilterProp="label"
            options={templates.map(({ id, name }) => ({
              value: id,
              label: name,
            }))}
            onChange={handleTemplateChange}
          />
        </Form.Item>
        <Form.Item
          label="Количество"
          name="quantity"
          rules={[{ required: true, message: 'Укажите количество' }]}
        >
          <InputNumber min={1} precision={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label="Способ расчета цены"
          name="customerPricingMethod"
          rules={[{ required: true, message: 'Выберите способ расчета' }]}
        >
          <Radio.Group block optionType="button" buttonStyle="solid">
            <Radio.Button value={CUSTOMER_PRICING_METHOD.PER_ITEM}>
              За штуку
            </Radio.Button>
            <Radio.Button value={CUSTOMER_PRICING_METHOD.LINEAR_METER}>
              М. погонный
            </Radio.Button>
            <Radio.Button value={CUSTOMER_PRICING_METHOD.AREA}>
              По площади
            </Radio.Button>
            <Radio.Button value={CUSTOMER_PRICING_METHOD.VOLUME}>
              По объему
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        <div className={styles.sectionTitle}>Атрибуты</div>
        <DynamicFields name="attributes" />
        <div className={styles.sectionTitle}>Характеристики</div>
        <DynamicFields name="characteristics" />
      </Form>
    </Modal>
  );
};
