import { css } from '@emotion/css';
import {
  Alert,
  App,
  AutoComplete,
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Skeleton,
  type FormProps,
} from 'antd';
import { useMemo, type FC } from 'react';

import {
  CUSTOMER_PRICING_METHOD,
  type ProductTemplate,
} from '@entities/product';
import {
  DynamicFields,
  dynamicFieldsToObject,
} from '@shared/ui/dynamic-fields';

import { getProductTemplateError } from '../api/product-display-template';
import { useCreateProductTemplates } from '../hooks/useCreateProductTemplates';
import type { ProductTemplateFieldType } from '../model/create-production-templates';

import { ProductDisplayTemplateEditor } from './ProductDisplayTemplateEditor';

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
    & .ant-input-number {
      width: 100%;
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
    justify-content: flex-end;
    gap: 16px;
    padding-top: 16px;
  `,
};

type Props = {
  onCreated?: (template: ProductTemplate) => void;
  onCancel?: () => void;
};

export const CreateForm: FC<Props> = ({ onCancel, onCreated }) => {
  const [form] = Form.useForm<ProductTemplateFieldType>();
  const {
    isMutating,
    trigger,
    isLoading,
    products,
    operations,
    operationsError,
    priceModifiers,
    priceModifiersError,
  } = useCreateProductTemplates();
  const { notification } = App.useApp();

  const productNames = useMemo(
    () =>
      new Set(
        products?.map(({ name }) => name.trim().toLocaleLowerCase()) ?? [],
      ),
    [products],
  );

  const groupOptions = useMemo(
    () =>
      Array.from(
        new Set(
          products
            ?.map(({ group }) => group?.trim())
            .filter((group): group is string => Boolean(group)) ?? [],
        ),
      )
        .sort((left, right) => left.localeCompare(right))
        .map((value) => ({ value })),
    [products],
  );

  const priceModifierOptions = useMemo(
    () =>
      priceModifiers?.map((modifier) => {
        const isGlobal = (modifier.productTemplates?.length ?? 0) === 0;

        return {
          label: isGlobal ? `${modifier.name} (глобальный)` : modifier.name,
          value: modifier.id,
          disabled: isGlobal,
        };
      }) ?? [],
    [priceModifiers],
  );

  const handleFinish: FormProps<ProductTemplateFieldType>['onFinish'] = (
    values,
  ) => {
    const { additionalCharacteristics, ...templateValues } = values;
    delete templateValues.displayTemplatePreview;
    trigger({
      ...templateValues,
      name: values.name.trim(),
      group: values.group?.trim() || undefined,
      displayTemplate: values.displayTemplate?.trim() || null,
      attributes: dynamicFieldsToObject(values.attributes),
      defaultCharacteristics: {
        ...values.defaultCharacteristics,
        ...dynamicFieldsToObject(additionalCharacteristics),
      },
    })
      .then((template) => {
        onCreated?.(template);
        notification.success({ title: 'Номенклатура успешно добавлена' });
        form.resetFields();
      })
      .catch((error: unknown) => {
        const details = getProductTemplateError(error);
        if (details?.field === 'displayTemplate') {
          form.setFields([
            {
              name: 'displayTemplate',
              errors: [details.message ?? 'Некорректный шаблон'],
            },
          ]);
        }
      });
  };

  const handleCancel = () => {
    onCancel?.();
    form.resetFields();
  };

  return (
    <Skeleton loading={isLoading} active>
      <Form
        name="create_product_template_form"
        form={form}
        className={styles.form}
        layout="vertical"
        initialValues={{
          defaultCharacteristics: {},
          attributes: [],
          additionalCharacteristics: [],
          priceModifierIds: [],
          operationIds: [],
          customerPricingMethod: CUSTOMER_PRICING_METHOD.PER_ITEM,
          baseCustomerPrice: 0,
        }}
        onFinish={handleFinish}
        autoComplete="off"
        preserve={false}
      >
        <div className={styles.formBody}>
          <Form.Item<ProductTemplateFieldType>
            label="Название"
            name="name"
            tooltip="Название номенклатуры должно быть уникальным"
            rules={[
              { required: true, whitespace: true, message: 'Введите название' },
              {
                validator: (_, value?: string) => {
                  if (
                    value &&
                    productNames.has(value.trim().toLocaleLowerCase())
                  ) {
                    return Promise.reject(
                      new Error(
                        'Номенклатура с таким названием уже существует',
                      ),
                    );
                  }

                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item<ProductTemplateFieldType> label="Группа" name="group">
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

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Ширина, мм"
                name={['defaultCharacteristics', 'width']}
              >
                <InputNumber min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Высота, мм"
                name={['defaultCharacteristics', 'height']}
              >
                <InputNumber min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Толщина, мм"
                name={['defaultCharacteristics', 'thickness']}
              >
                <InputNumber min={0} />
              </Form.Item>
            </Col>
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

          <Form.Item<ProductTemplateFieldType>
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

          <Form.Item<ProductTemplateFieldType>
            label="Базовая цена"
            name="baseCustomerPrice"
            rules={[{ required: true, message: 'Введите базовую цену' }]}
          >
            <InputNumber min={0} precision={2} />
          </Form.Item>

          <Form.Item<ProductTemplateFieldType>
            label="Работы"
            name="operationIds"
          >
            <Select
              aria-label="Работы"
              mode="multiple"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Выберите работы"
              options={operations?.map(({ id, name }) => ({
                label: name,
                value: id,
              }))}
            />
          </Form.Item>

          {operationsError && (
            <Alert
              type="error"
              title="Не удалось загрузить справочник работ"
              showIcon
            />
          )}

          <Form.Item<ProductTemplateFieldType>
            label="Ценовые модификаторы"
            name="priceModifierIds"
            extra="Глобальные модификаторы уже применяются ко всем продуктам"
          >
            <Select
              aria-label="Ценовые модификаторы"
              mode="multiple"
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Выберите модификаторы"
              options={priceModifierOptions}
            />
          </Form.Item>

          {priceModifiersError && (
            <Alert
              type="error"
              title="Не удалось загрузить ценовые модификаторы"
              showIcon
            />
          )}

          <ProductDisplayTemplateEditor form={form} />
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
