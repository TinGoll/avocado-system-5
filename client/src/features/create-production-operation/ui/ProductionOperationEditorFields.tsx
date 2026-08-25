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
  Typography,
  type FormInstance,
} from 'antd';
import { useEffect, useState, type FC } from 'react';

import {
  getPreviewError,
  previewProductionOperation,
  type ProductionOperationPreview,
} from '../api/preview-production-operation';
import type { FieldType } from '../model/create-production-operation';

const variables = [
  ['item.name', 'Название продукта (только для шаблона названия)'],
  ['item.width', 'Ширина позиции, мм'],
  ['item.height', 'Высота позиции, мм'],
  ['item.thickness', 'Толщина позиции, мм'],
  ['item.quantity', 'Количество, шт.'],
  ['profile.width', 'Ширина профиля, мм'],
  ['profile.grooveDepth', 'Глубина паза профиля, мм'],
  ['panelWidth', 'Внутренняя ширина с учётом профиля, мм (опционально)'],
  ['panelHeight', 'Внутренняя высота с учётом профиля, мм (опционально)'],
] as const;

const styles = css`
  .preview-grid .ant-form-item {
    margin-bottom: 12px;
  }
`;

type Props = { form: FormInstance<FieldType> };

export const ProductionOperationEditorFields: FC<Props> = ({ form }) => {
  const values = Form.useWatch([], form) as FieldType | undefined;
  const [preview, setPreview] = useState<ProductionOperationPreview>();
  const [previewError, setPreviewError] = useState<string>();
  const [loading, setLoading] = useState(false);

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
          ...(test.profileWidth !== undefined || test.grooveDepth !== undefined
            ? {
                orderCharacteristics: {
                  profile: {
                    characteristics: {
                      width: test.profileWidth,
                      grooveDepth: test.grooveDepth,
                    },
                  },
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
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      <Form.Item<FieldType>
        label="Формула расчёта"
        name="calculationFormula"
        rules={[
          { required: true, whitespace: true, message: 'Введите формулу' },
        ]}
      >
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item<FieldType>
        label="Шаблон названия"
        name="displayNameTemplate"
        rules={[
          { required: true, whitespace: true, message: 'Введите шаблон' },
        ]}
      >
        <Input placeholder="Например: {{ item.height }}х{{ item.width }} — {{ item.quantity }} шт." />
      </Form.Item>

      <Card size="small" title="Доступные переменные">
        <Descriptions
          column={1}
          size="small"
          items={variables.map(([name, description]) => ({
            key: name,
            label: <Typography.Text code>{name}</Typography.Text>,
            children: description,
          }))}
        />
      </Card>

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
                {name === 'name' ? (
                  <Input />
                ) : (
                  <InputNumber min={0} style={{ width: '100%' }} />
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
