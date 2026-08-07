import { PlusCircleOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  type RefSelectProps,
} from 'antd';
import {
  useMemo,
  useRef,
  type FC,
  type FocusEvent,
  type ReactNode,
} from 'react';

import { useProductTemplates } from '@entities/product';

import { useOptimisticAddItem } from './model/useOptimisticAddItem';

const styles = {
  container: css`
    border-left: 1px solid var(--app-devider-color);
    border-right: 1px solid var(--app-devider-color);
    border-bottom: 1px solid var(--app-devider-color);
    padding: 8px;
    display: flex;
    gap: 4px;
  `,
  form: css`
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    & .ant-form-item {
      margin: 0;
    }
    & .ant-select {
      min-width: 240px;
    }
    & .ant-input-number {
      width: 110px;
    }
  `,
  button: css`
    display: flex;
    align-items: flex-end;
    justify-content: center;
  `,
  description: css`
    flex: 1;
  `,
};

type Props = {
  orderID: string;
  createProductTemplateButton: ReactNode;
};

type FormValues = {
  templateId: string;
  height?: number;
  width?: number;
  thickness?: number;
  quantity: number;
  comment?: string;
};

export const AddOrderItemForm: FC<Props> = ({
  orderID,
  createProductTemplateButton,
}) => {
  const [form] = Form.useForm<FormValues>();
  const nomenclatureRef = useRef<RefSelectProps>(null);
  const { notification } = App.useApp();
  const { data, isLoading, error } = useProductTemplates();
  const products = useMemo(() => data?.products ?? [], [data?.products]);
  const { addItem, isMutating } = useOptimisticAddItem({ orderID });
  const selectedTemplateId = Form.useWatch('templateId', form);
  const selectedTemplate = useMemo(
    () => products.find(({ id }) => id === selectedTemplateId),
    [products, selectedTemplateId],
  );

  const options = useMemo(
    () =>
      products.map((product) => ({
        label: product.name,
        value: product.id,
      })),
    [products],
  );

  const focusAndSelectNomenclature = () => {
    requestAnimationFrame(() => {
      nomenclatureRef.current?.focus();
      const input =
        nomenclatureRef.current?.nativeElement.querySelector('input');
      input?.select();
    });
  };

  const selectValueOnFocus = (event: FocusEvent<HTMLInputElement>) => {
    if (event.currentTarget.value) {
      event.currentTarget.select();
    }
  };

  const handleTemplateChange = (templateId: string) => {
    const template = products.find(({ id }) => id === templateId);

    form.setFieldsValue({
      height: template?.defaultCharacteristics.height,
      width: template?.defaultCharacteristics.width,
      thickness: template?.defaultCharacteristics.thickness,
    });
  };

  const handleFinish = async (values: FormValues) => {
    const template = products.find(({ id }) => id === values.templateId);
    if (!template) return;

    try {
      await addItem({
        template,
        quantity: values.quantity,
        characteristics: {
          height: values.height,
          width: values.width,
          thickness: values.thickness,
          comment: values.comment?.trim() || undefined,
        },
      });
      form.setFieldsValue({
        height: template.defaultCharacteristics.height,
        width: template.defaultCharacteristics.width,
        thickness: template.defaultCharacteristics.thickness,
        quantity: 1,
        comment: undefined,
      });
      focusAndSelectNomenclature();
    } catch {
      notification.error({ message: 'Не удалось добавить элемент заказа' });
    }
  };

  return (
    <div className={styles.container}>
      {createProductTemplateButton}
      <Form
        className={styles.form}
        name="item-creator-form"
        form={form}
        layout="vertical"
        autoComplete="off"
        initialValues={{ quantity: 1 }}
        onFinish={handleFinish}
      >
        <Form.Item name="templateId" rules={[{ required: true, message: '' }]}>
          <Select
            ref={nomenclatureRef}
            variant="underlined"
            placeholder="Номенклатура"
            options={options}
            loading={isLoading}
            status={error ? 'error' : undefined}
            showSearch
            optionFilterProp="label"
            filterOption={(input, option) =>
              String(option?.label ?? '')
                .toLocaleLowerCase()
                .includes(input.trim().toLocaleLowerCase())
            }
            onFocus={selectValueOnFocus}
            onChange={handleTemplateChange}
          />
        </Form.Item>
        <Form.Item name="height">
          <InputNumber
            disabled={Boolean(selectedTemplate?.defaultCharacteristics.height)}
            onFocus={selectValueOnFocus}
            min={0}
            variant="underlined"
            placeholder="Высота"
          />
        </Form.Item>
        <Form.Item name="width">
          <InputNumber
            disabled={Boolean(selectedTemplate?.defaultCharacteristics.width)}
            onFocus={selectValueOnFocus}
            min={0}
            variant="underlined"
            placeholder="Ширина"
          />
        </Form.Item>
        <Form.Item name="thickness">
          <InputNumber
            disabled={Boolean(
              selectedTemplate?.defaultCharacteristics.thickness,
            )}
            onFocus={selectValueOnFocus}
            min={0}
            variant="underlined"
            placeholder="Толщина"
          />
        </Form.Item>
        <Form.Item name="quantity" rules={[{ required: true, message: '' }]}>
          <InputNumber
            min={1}
            precision={0}
            onFocus={selectValueOnFocus}
            variant="underlined"
            placeholder="Количество"
          />
        </Form.Item>
        <Form.Item className={styles.description} name="comment">
          <Input
            variant="underlined"
            placeholder="Комментарий"
            onFocus={selectValueOnFocus}
          />
        </Form.Item>

        <Form.Item className={styles.button}>
          <Button
            variant="solid"
            color="purple"
            htmlType="submit"
            icon={<PlusCircleOutlined />}
            loading={isMutating}
          >
            Добавить
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};
