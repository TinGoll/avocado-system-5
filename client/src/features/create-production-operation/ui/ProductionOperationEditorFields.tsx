import { css } from '@emotion/css';
import {
  Alert,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Row,
  Space,
  Spin,
  type FormInstance,
} from 'antd';
import type { InputRef } from 'antd';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import { useEffect, useRef, useState, type FC } from 'react';

import {
  getPreviewError,
  previewProductionOperation,
  type ProductionOperationPreview,
} from '../api/preview-production-operation';
import { useProductionOperationVariables } from '../api/template-variable-metadata';
import type { ProductionOperationVariableMetadata } from '../api/template-variable-metadata';
import type { FieldType } from '../model/create-production-operation';

import { ProductionOperationVariableBuilder } from './ProductionOperationVariableBuilder';

const styles = css`
  width: 100%;

  .preview-grid .ant-form-item {
    margin-bottom: 12px;
  }

  .preview-input {
    width: 100%;
  }
`;

type EditorField = 'calculationFormula' | 'displayNameTemplate';
type Selection = { start: number; end: number };

const formulaOperations = [
  { label: '+', value: ' + ', description: 'Сложение' },
  { label: '−', value: ' - ', description: 'Вычитание' },
  { label: '×', value: ' * ', description: 'Умножение' },
  { label: '÷', value: ' / ', description: 'Деление' },
  { label: '(', value: '(', description: 'Открывающая скобка' },
  { label: ')', value: ')', description: 'Закрывающая скобка' },
];

type Props = { form: FormInstance<FieldType> };

export const ProductionOperationEditorFields: FC<Props> = ({ form }) => {
  const {
    data: variables,
    error: variablesError,
    isLoading: variablesLoading,
  } = useProductionOperationVariables();
  const values = Form.useWatch([], form) as FieldType | undefined;
  const [preview, setPreview] = useState<ProductionOperationPreview>();
  const [previewError, setPreviewError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const formulaRef = useRef<TextAreaRef>(null);
  const templateRef = useRef<InputRef>(null);
  const elementsRef = useRef<
    Partial<Record<EditorField, HTMLInputElement | HTMLTextAreaElement>>
  >({});
  const selectionsRef = useRef<Partial<Record<EditorField, Selection>>>({});

  const saveSelection = (
    field: EditorField,
    element: HTMLInputElement | HTMLTextAreaElement,
  ) => {
    elementsRef.current[field] = element;
    selectionsRef.current[field] = {
      start: element.selectionStart ?? element.value.length,
      end: element.selectionEnd ?? element.value.length,
    };
  };

  const insertToken = (field: EditorField, token: string) => {
    const currentValue = form.getFieldValue(field) ?? '';
    const selection = selectionsRef.current[field] ?? {
      start: currentValue.length,
      end: currentValue.length,
    };
    const nextValue = `${currentValue.slice(0, selection.start)}${token}${currentValue.slice(selection.end)}`;
    const cursorPosition = selection.start + token.length;

    selectionsRef.current[field] = {
      start: cursorPosition,
      end: cursorPosition,
    };
    form.setFields([{ name: field, value: nextValue, touched: true }]);
    void form
      .validateFields([field])
      .catch(() => undefined)
      .finally(() => {
        window.requestAnimationFrame(() => {
          const fallback =
            field === 'calculationFormula'
              ? formulaRef.current?.resizableTextArea?.textArea
              : templateRef.current?.input;
          const element = elementsRef.current[field] ?? fallback;
          element?.focus();
          element?.setSelectionRange(cursorPosition, cursorPosition);
        });
      });
  };

  useEffect(() => {
    const formula = values?.calculationFormula?.trim();
    const template = values?.displayNameTemplate?.trim();
    const test = values?.preview;
    if (!formula || !template || !test || !values.costPerUnit) {
      setPreview(undefined);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const result = await previewProductionOperation({
          calculationFormula: formula,
          displayNameTemplate: template,
          costPerUnit: values.costPerUnit,
          item: {
            name: test.name,
            width: test.width,
            height: test.height,
            thickness: test.thickness,
            quantity: test.quantity,
          },
          ...(test.profileWidth !== undefined ||
          test.grooveDepth !== undefined ||
          test.profileName ||
          test.panelName
            ? {
                orderCharacteristics: {
                  ...(test.profileWidth !== undefined ||
                  test.grooveDepth !== undefined ||
                  test.profileName
                    ? {
                        profile: {
                          name: test.profileName,
                          characteristics: {
                            width: test.profileWidth,
                            grooveDepth: test.grooveDepth,
                          },
                        },
                      }
                    : {}),
                  ...(test.panelName
                    ? {
                        panel: {
                          name: test.panelName,
                        },
                      }
                    : {}),
                },
              }
            : {}),
        });
        setPreview(result);
        setPreviewError(undefined);
        form.setFields([
          { name: 'calculationFormula', errors: [] },
          { name: 'displayNameTemplate', errors: [] },
        ]);
      } catch (error) {
        const details = getPreviewError(error);
        const message = details.message ?? 'Не удалось выполнить предпросмотр';
        setPreview(undefined);
        setPreviewError(message);
        if (
          details.field === 'calculationFormula' ||
          details.field === 'displayNameTemplate'
        ) {
          form.setFields([{ name: details.field, errors: [message] }]);
        }
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [form, values]);

  return (
    <Space orientation="vertical" size="middle" className={styles}>
      <Form.Item<FieldType>
        label="Формула расчёта"
        name="calculationFormula"
        rules={[
          { required: true, whitespace: true, message: 'Введите формулу' },
        ]}
      >
        <Input.TextArea
          ref={formulaRef}
          rows={3}
          onSelect={(event) =>
            saveSelection('calculationFormula', event.currentTarget)
          }
          onClick={(event) =>
            saveSelection('calculationFormula', event.currentTarget)
          }
          onKeyUp={(event) =>
            saveSelection('calculationFormula', event.currentTarget)
          }
        />
      </Form.Item>
      <ProductionOperationVariableBuilder
        title="Конструктор формулы"
        description="Нажмите на переменную, чтобы вставить её в формулу."
        variables={(variables ?? []).filter(
          ({ availability }) => availability === 'formula-and-name',
        )}
        loading={variablesLoading}
        error={variablesError}
        onInsert={(variable: ProductionOperationVariableMetadata) =>
          insertToken('calculationFormula', variable.path)
        }
        operations={formulaOperations}
        onInsertOperation={(operation) =>
          insertToken('calculationFormula', operation)
        }
      />
      <Form.Item<FieldType>
        label="Шаблон названия"
        name="displayNameTemplate"
        rules={[
          { required: true, whitespace: true, message: 'Введите шаблон' },
        ]}
      >
        <Input
          ref={templateRef}
          placeholder="Например: {{ item.height }}х{{ item.width }} — {{ item.quantity }} шт."
          onSelect={(event) =>
            saveSelection('displayNameTemplate', event.currentTarget)
          }
          onClick={(event) =>
            saveSelection('displayNameTemplate', event.currentTarget)
          }
          onKeyUp={(event) =>
            saveSelection('displayNameTemplate', event.currentTarget)
          }
        />
      </Form.Item>
      <ProductionOperationVariableBuilder
        title="Конструктор шаблона названия"
        description="Нажмите на переменную, чтобы вставить её в шаблон."
        variables={variables ?? []}
        loading={variablesLoading}
        error={variablesError}
        onInsert={(variable: ProductionOperationVariableMetadata) =>
          insertToken('displayNameTemplate', `{{ ${variable.path} }}`)
        }
      />

      <Card size="small" title="Тестовые значения" className={styles}>
        <Row gutter={12} className="preview-grid">
          {[
            ['name', 'Название продукта'],
            ['width', 'Ширина, мм'],
            ['height', 'Высота, мм'],
            ['thickness', 'Толщина, мм'],
            ['quantity', 'Количество, шт.'],
            ['profileWidth', 'Ширина профиля, мм'],
            ['grooveDepth', 'Глубина паза, мм'],
            ['profileName', 'Название профиля'],
            ['panelName', 'Название филёнки'],
          ].map(([name, label]) => (
            <Col xs={24} sm={12} md={8} key={name}>
              <Form.Item
                label={label}
                name={['preview', name]}
                rules={[
                  {
                    required:
                      name === 'name' ||
                      name === 'width' ||
                      name === 'height' ||
                      name === 'quantity',
                  },
                ]}
              >
                {name === 'name' ||
                name === 'profileName' ||
                name === 'panelName' ? (
                  <Input />
                ) : (
                  <InputNumber min={0} className="preview-input" />
                )}
              </Form.Item>
            </Col>
          ))}
        </Row>
      </Card>

      <Spin spinning={loading}>
        {previewError ? (
          <Alert type="error" showIcon title={previewError} />
        ) : null}
        {preview ? (
          <Card size="small" title="Предпросмотр">
            <Descriptions
              column={1}
              size="small"
              items={[
                {
                  key: 'geometry',
                  label: 'Внутренний размер по профилю',
                  children:
                    preview.panelHeight !== undefined &&
                    preview.panelWidth !== undefined
                      ? `${preview.panelHeight}×${preview.panelWidth} мм`
                      : '—',
                },
                {
                  key: 'quantity',
                  label: 'Расчётное количество',
                  children: preview.calculatedQuantity,
                },
                {
                  key: 'name',
                  label: 'Строка',
                  children: preview.renderedName,
                },
                {
                  key: 'cost',
                  label: 'Стоимость',
                  children: `${preview.calculatedCost.toFixed(2)} ₽`,
                },
              ]}
            />
          </Card>
        ) : null}
      </Spin>
    </Space>
  );
};
