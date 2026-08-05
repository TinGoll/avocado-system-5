import { css } from '@emotion/css';
import {
  App,
  AutoComplete,
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Skeleton,
  type FormProps,
} from 'antd';
import { useMemo, type FC } from 'react';

import {
  CUSTOMER_PRICING_METHOD,
  type ProductTemplate,
} from '@entities/product';

import { useCreateProductTemplates } from '../hooks/useCreateProductTemplates';
import type { ProductTemplateFieldType } from '../model/create-production-templates';

const styles = {
  form: css`
    box-sizing: border-box;
    & .ant-form-item {
      margin-bottom: 16px;
    }
    & .ant-input-number {
      width: 100%;
    }
  `,
  formActions: css`
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
  const { isMutating, trigger, isLoading, products } =
    useCreateProductTemplates();
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

  const handleFinish: FormProps<ProductTemplateFieldType>['onFinish'] = (
    values,
  ) => {
    trigger({
      ...values,
      name: values.name.trim(),
      group: values.group?.trim() || undefined,
      attributes: {},
    }).then((template) => {
      onCreated?.(template);
      notification.success({ message: 'Номенклатура успешно добавлена' });
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
        name="create_product_template_form"
        form={form}
        className={styles.form}
        layout="vertical"
        initialValues={{
          defaultCharacteristics: {},
          customerPricingMethod: CUSTOMER_PRICING_METHOD.PER_ITEM,
          baseCustomerPrice: 0,
        }}
        onFinish={handleFinish}
        autoComplete="off"
        preserve={false}
      >
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
                    new Error('Номенклатура с таким названием уже существует'),
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

        <Form.Item<ProductTemplateFieldType>
          label="Способ расчета цены"
          name="customerPricingMethod"
          rules={[{ required: true, message: 'Выберите способ расчета' }]}
        >
          <Radio.Group block optionType="button" buttonStyle="solid">
            <Radio.Button value={CUSTOMER_PRICING_METHOD.PER_ITEM}>
              За штуку
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
