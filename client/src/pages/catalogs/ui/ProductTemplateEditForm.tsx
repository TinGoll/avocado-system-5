import {
  Alert,
  AutoComplete,
  Col,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
} from 'antd';
import { useMemo, type FC } from 'react';

import {
  CUSTOMER_PRICING_METHOD,
  type ProductTemplate,
} from '@entities/product';
import type { ProductionOperation } from '@entities/production-operation';
import { ProductDisplayTemplateEditor } from '@features/create-production-templates';
import { DynamicFields } from '@shared/ui/dynamic-fields';

import type { ProductTemplateEditValues } from '../model/product-template-edit';

type Props = {
  products: ProductTemplate[];
  currentProduct: ProductTemplate;
  operations: ProductionOperation[];
  operationsError?: unknown;
};

export const ProductTemplateEditForm: FC<Props> = ({
  products,
  currentProduct,
  operations,
  operationsError,
}) => {
  const form = Form.useFormInstance<ProductTemplateEditValues>();
  const operationOptions = useMemo(() => {
    const availableIds = new Set(operations.map(({ id }) => id));
    const unavailable =
      currentProduct.operations?.filter(({ id }) => !availableIds.has(id)) ??
      [];

    return [
      ...operations.map(({ id, name }) => ({ label: name, value: id })),
      ...unavailable.map(({ id, name }) => ({
        label: `${name} (недоступна)`,
        value: id,
        disabled: true,
      })),
    ];
  }, [currentProduct.operations, operations]);
  const groupOptions = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map(({ group }) => group?.trim())
            .filter((group): group is string => Boolean(group)),
        ),
      )
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ value })),
    [products],
  );

  const otherProductNames = useMemo(
    () =>
      new Set(
        products
          .filter(({ id }) => id !== currentProduct.id)
          .map(({ name }) => name.trim().toLocaleLowerCase()),
      ),
    [currentProduct.id, products],
  );

  return (
    <>
      <Form.Item<ProductTemplateEditValues>
        label="Название"
        name="name"
        tooltip="Название номенклатуры должно быть уникальным"
        rules={[
          { required: true, whitespace: true, message: 'Введите название' },
          {
            validator: (_, value?: string) =>
              value && otherProductNames.has(value.trim().toLocaleLowerCase())
                ? Promise.reject(
                    new Error('Номенклатура с таким названием уже существует'),
                  )
                : Promise.resolve(),
          },
        ]}
      >
        <Input />
      </Form.Item>

      <Form.Item<ProductTemplateEditValues> label="Группа" name="group">
        <AutoComplete
          options={groupOptions}
          placeholder="Введите или выберите группу"
          filterOption={(inputValue, option) =>
            String(option?.value ?? '')
              .toLocaleLowerCase()
              .includes(inputValue.trim().toLocaleLowerCase())
          }
          allowClear
        />
      </Form.Item>

      <ProductDisplayTemplateEditor form={form} />

      <Row gutter={16}>
        {(['width', 'height', 'thickness'] as const).map((dimension) => (
          <Col span={8} key={dimension}>
            <Form.Item
              label={
                dimension === 'width'
                  ? 'Ширина, мм'
                  : dimension === 'height'
                    ? 'Высота, мм'
                    : 'Толщина, мм'
              }
              name={['defaultCharacteristics', dimension]}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        ))}
      </Row>

      <Form.Item label="Дополнительные характеристики">
        <DynamicFields
          name="additionalCharacteristics"
          addButtonText="Добавить характеристику"
        />
      </Form.Item>

      <Form.Item label="Атрибуты">
        <DynamicFields name="attributes" addButtonText="Добавить атрибут" />
      </Form.Item>

      <Form.Item<ProductTemplateEditValues>
        label="Способ расчёта цены"
        name="customerPricingMethod"
        rules={[{ required: true, message: 'Выберите способ расчёта' }]}
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
            По объёму
          </Radio.Button>
        </Radio.Group>
      </Form.Item>

      <Form.Item<ProductTemplateEditValues> label="Работы" name="operationIds">
        <Select
          aria-label="Работы"
          mode="multiple"
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Выберите работы"
          options={operationOptions}
        />
      </Form.Item>

      {operationsError && (
        <Alert
          type="error"
          title="Не удалось загрузить справочник работ"
          showIcon
        />
      )}

      <Form.Item<ProductTemplateEditValues>
        label="Базовая цена"
        name="baseCustomerPrice"
        rules={[{ required: true, message: 'Введите базовую цену' }]}
      >
        <InputNumber min={0} precision={2} style={{ width: '100%' }} />
      </Form.Item>
    </>
  );
};
