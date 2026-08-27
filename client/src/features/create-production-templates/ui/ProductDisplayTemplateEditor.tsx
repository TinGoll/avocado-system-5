import {
  Alert,
  Card,
  Descriptions,
  Form,
  Input,
  Space,
  Spin,
  Typography,
  type FormInstance,
} from 'antd';
import { useEffect, useState } from 'react';

import {
  previewProductDisplayTemplate,
  getProductTemplateError,
  useProductOutputVariables,
} from '../api/product-display-template';

type Values = {
  name?: string;
  displayTemplate?: string | null;
  defaultCharacteristics?: {
    width?: number;
    height?: number;
    thickness?: number;
  };
  displayTemplatePreview?: Record<string, string>;
};

export const ProductDisplayTemplateEditor = ({
  form,
}: {
  form: FormInstance;
}) => {
  const values = Form.useWatch([], form) as Values | undefined;
  const {
    data: variables,
    error: variablesError,
    isLoading,
  } = useProductOutputVariables();
  const [preview, setPreview] = useState<string>();
  const [previewError, setPreviewError] = useState<string>();

  useEffect(() => {
    const displayTemplate = values?.displayTemplate?.trim();
    if (!displayTemplate) {
      setPreview(undefined);
      setPreviewError(undefined);
      return;
    }
    const timeout = window.setTimeout(async () => {
      const named = Object.fromEntries(
        Object.entries(values?.displayTemplatePreview ?? {}).flatMap(
          ([key, name]) => (name?.trim() ? [[key, { name: name.trim() }]] : []),
        ),
      );
      try {
        const result = await previewProductDisplayTemplate({
          displayTemplate,
          item: {
            name: values?.name?.trim() || 'Продукт',
            ...values?.defaultCharacteristics,
            quantity: 1,
          },
          orderCharacteristics: named,
        });
        setPreview(result.renderedValue);
        setPreviewError(undefined);
        form.setFields([{ name: 'displayTemplate', errors: [] }]);
      } catch (error) {
        const details = getProductTemplateError(error);
        const message = details?.message ?? 'Не удалось выполнить предпросмотр';
        setPreview(undefined);
        setPreviewError(message);
        if (details?.field === 'displayTemplate') {
          form.setFields([{ name: 'displayTemplate', errors: [message] }]);
        }
      }
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [form, values]);

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      <Form.Item
        label="Шаблон представления"
        name="displayTemplate"
        extra="Не заменяет обычное название номенклатуры"
        rules={[{ max: 500, message: 'Не более 500 символов' }]}
      >
        <Input.TextArea
          rows={3}
          placeholder="{{ item.name }} {{ item.height }}×{{ item.width }}, {{ material.name }}"
        />
      </Form.Item>
      <Card size="small" title="Доступные переменные">
        <Spin spinning={isLoading}>
          {variablesError ? (
            <Alert
              type="error"
              showIcon
              title="Не удалось загрузить доступные переменные"
            />
          ) : (
            <Descriptions
              column={1}
              size="small"
              items={(variables ?? []).map((variable) => ({
                key: variable.path,
                label: <Typography.Text code>{variable.path}</Typography.Text>,
                children: `${variable.label}${variable.unit ? `, ${variable.unit}` : ''}`,
              }))}
            />
          )}
        </Spin>
      </Card>
      <Card size="small" title="Тестовые характеристики">
        {['material', 'color', 'patina', 'profile', 'panel', 'varnish'].map(
          (name) => (
            <Form.Item
              key={name}
              label={name}
              name={['displayTemplatePreview', name]}
            >
              <Input />
            </Form.Item>
          ),
        )}
      </Card>
      {previewError ? (
        <Alert type="error" showIcon title={previewError} />
      ) : null}
      {preview !== undefined ? (
        <Alert
          type="success"
          showIcon
          title="Предпросмотр"
          description={preview}
        />
      ) : null}
    </Space>
  );
};
