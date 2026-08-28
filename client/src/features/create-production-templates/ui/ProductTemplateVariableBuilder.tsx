import { css } from '@emotion/css';
import { Alert, Button, Card, Flex, Spin, Tooltip, Typography } from 'antd';

import type { ProductOutputVariable } from '../api/product-display-template';

type Props = {
  variables: ProductOutputVariable[];
  loading: boolean;
  error?: unknown;
  onInsert: (variable: ProductOutputVariable) => void;
};

const variableButton = css`
  height: auto;
  max-width: 100%;
  min-height: 26px;
  white-space: normal;
`;

export const ProductTemplateVariableBuilder = ({
  variables,
  loading,
  error,
  onInsert,
}: Props) => (
  <Card size="small" title="Конструктор шаблона">
    <Typography.Paragraph type="secondary">
      Нажмите на переменную, чтобы вставить её в шаблон.
    </Typography.Paragraph>
    <Spin spinning={loading}>
      {error ? (
        <Alert
          type="error"
          showIcon
          title="Не удалось загрузить доступные переменные"
        />
      ) : variables.length === 0 && !loading ? (
        <Typography.Text type="secondary">
          Нет доступных переменных
        </Typography.Text>
      ) : (
        <Flex wrap gap="small">
          {variables.map((variable) => {
            const token = `{{ ${variable.path} }}`;

            return (
              <Tooltip
                key={variable.path}
                trigger={['hover', 'focus']}
                title={
                  <Flex vertical gap={2}>
                    <span>{variable.description}</span>
                    <span>
                      Вставка: <Typography.Text code>{token}</Typography.Text>
                    </span>
                    {variable.optional ? (
                      <span>Опциональное значение</span>
                    ) : null}
                  </Flex>
                }
              >
                <Button
                  htmlType="button"
                  size="small"
                  aria-label={`Вставить переменную «${variable.label}»`}
                  onClick={() => onInsert(variable)}
                  className={variableButton}
                >
                  {variable.label}
                  {variable.unit ? `, ${variable.unit}` : ''}
                </Button>
              </Tooltip>
            );
          })}
        </Flex>
      )}
    </Spin>
  </Card>
);
