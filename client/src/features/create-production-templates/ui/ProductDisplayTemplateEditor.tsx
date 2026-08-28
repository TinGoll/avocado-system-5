import {
  Alert,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Space,
  Typography,
  type FormInstance,
} from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import { useEffect, useRef, useState } from 'react';

import {
  previewProductDisplayTemplate,
  getProductTemplateError,
  type ProductOutputVariable,
  useProductOutputVariables,
} from '../api/product-display-template';

import { ProductTemplateVariableBuilder } from './ProductTemplateVariableBuilder';

type Values = {
  name?: string;
  displayTemplate?: string | null;
  defaultCharacteristics?: {
    width?: number;
    height?: number;
    thickness?: number;
  };
  displayTemplatePreview?: {
    width?: number;
    height?: number;
    thickness?: number;
    material?: string;
    color?: string;
    patina?: string;
    profile?: string;
    panel?: string;
    varnish?: string;
  };
};

const previewCharacteristics = [
  { name: 'material', label: 'Материал', initialValue: 'МДФ' },
  { name: 'color', label: 'Цвет', initialValue: 'Белый' },
  { name: 'patina', label: 'Патина', initialValue: 'Золотая' },
  { name: 'profile', label: 'Профиль', initialValue: 'Классический' },
  { name: 'panel', label: 'Филёнка', initialValue: 'Прямая' },
  { name: 'varnish', label: 'Лак', initialValue: 'Матовый' },
] as const;

const defaultDisplayTemplate =
  '{{ item.name }}: {{ item.height }} × {{ item.width }} - {{ item.quantity }}';

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
  const textAreaRef = useRef<TextAreaRef>(null);
  const textAreaElementRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef<{ start: number; end: number } | undefined>(
    undefined,
  );

  const saveSelection = (element: HTMLTextAreaElement) => {
    textAreaElementRef.current = element;
    selectionRef.current = {
      start: element.selectionStart,
      end: element.selectionEnd,
    };
  };

  const handleInsert = (variable: ProductOutputVariable) => {
    const currentValue = form.getFieldValue('displayTemplate') ?? '';
    const token = `{{ ${variable.path} }}`;
    const selection = selectionRef.current ?? {
      start: currentValue.length,
      end: currentValue.length,
    };
    const nextValue = `${currentValue.slice(0, selection.start)}${token}${currentValue.slice(selection.end)}`;
    const cursorPosition = selection.start + token.length;

    selectionRef.current = {
      start: cursorPosition,
      end: cursorPosition,
    };
    form.setFields([
      {
        name: 'displayTemplate',
        value: nextValue,
        touched: true,
      },
    ]);
    void form
      .validateFields(['displayTemplate'])
      .catch(() => undefined)
      .finally(() => {
        window.requestAnimationFrame(() => {
          const textArea =
            textAreaElementRef.current ??
            textAreaRef.current?.resizableTextArea?.textArea;
          textArea?.focus();
          textArea?.setSelectionRange(cursorPosition, cursorPosition);
        });
      });
  };

  useEffect(() => {
    const displayTemplate = values?.displayTemplate?.trim();
    if (!displayTemplate) {
      setPreview(undefined);
      setPreviewError(undefined);
      return;
    }
    const timeout = window.setTimeout(async () => {
      const { width, height, thickness, ...characteristics } =
        values?.displayTemplatePreview ?? {};
      const named = Object.fromEntries(
        Object.entries(characteristics).flatMap(([key, name]) =>
          name?.trim() ? [[key, { name: name.trim() }]] : [],
        ),
      );
      try {
        const result = await previewProductDisplayTemplate({
          displayTemplate,
          item: {
            name: values?.name?.trim() || 'Продукт',
            ...values?.defaultCharacteristics,
            width: width ?? values?.defaultCharacteristics?.width,
            height: height ?? values?.defaultCharacteristics?.height,
            thickness: thickness ?? values?.defaultCharacteristics?.thickness,
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
        initialValue={defaultDisplayTemplate}
        extra="Не заменяет обычное название номенклатуры"
        rules={[{ max: 500, message: 'Не более 500 символов' }]}
      >
        <Input.TextArea
          ref={textAreaRef}
          rows={3}
          placeholder="{{ item.name }} {{ item.height }}×{{ item.width }}, {{ material.name }}"
          onSelect={(event) => saveSelection(event.currentTarget)}
          onClick={(event) => saveSelection(event.currentTarget)}
          onKeyUp={(event) => saveSelection(event.currentTarget)}
        />
      </Form.Item>
      <ProductTemplateVariableBuilder
        variables={variables ?? []}
        loading={isLoading}
        error={variablesError}
        onInsert={handleInsert}
      />
      <Card size="small" title="Тестовые характеристики">
        <Row gutter={[8, 0]}>
          <Col xs={12} sm={8}>
            <Form.Item
              label="Ширина, мм"
              name={['displayTemplatePreview', 'width']}
              initialValue={600}
              style={{ marginBottom: 8 }}
            >
              <InputNumber min={0} size="small" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item
              label="Высота, мм"
              name={['displayTemplatePreview', 'height']}
              initialValue={800}
              style={{ marginBottom: 8 }}
            >
              <InputNumber min={0} size="small" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item
              label="Толщина, мм"
              name={['displayTemplatePreview', 'thickness']}
              initialValue={18}
              style={{ marginBottom: 8 }}
            >
              <InputNumber min={0} size="small" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          {previewCharacteristics.map(({ name, label, initialValue }) => (
            <Col key={name} xs={12} sm={8}>
              <Form.Item
                label={label}
                name={['displayTemplatePreview', name]}
                initialValue={initialValue}
                style={{ marginBottom: 8 }}
              >
                <Input size="small" />
              </Form.Item>
            </Col>
          ))}
        </Row>
      </Card>
      {previewError ? (
        <Alert type="error" showIcon title={previewError} />
      ) : null}
      {preview !== undefined ? (
        <div role="status" aria-label="Предпросмотр шаблона">
          <Typography.Text type="secondary">Предпросмотр: </Typography.Text>
          <Typography.Text>{preview}</Typography.Text>
        </div>
      ) : null}
    </Space>
  );
};
