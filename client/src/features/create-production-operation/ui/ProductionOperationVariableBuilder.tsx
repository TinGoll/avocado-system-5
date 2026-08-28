import { css } from '@emotion/css';
import { Alert, Button, Card, Flex, Spin, Tooltip, Typography } from 'antd';

import type { ProductionOperationVariableMetadata } from '../api/template-variable-metadata';

type Props = {
  title: string;
  description: string;
  variables: ProductionOperationVariableMetadata[];
  loading: boolean;
  error?: unknown;
  onInsert: (variable: ProductionOperationVariableMetadata) => void;
  operations?: { label: string; value: string; description: string }[];
  onInsertOperation?: (operation: string) => void;
};

const variableButton = css`
  height: auto;
  max-width: 100%;
  min-height: 26px;
  white-space: normal;
`;

const operationButtons = css`
  margin-top: 12px;
`;

export const ProductionOperationVariableBuilder = ({
  title,
  description,
  variables,
  loading,
  error,
  onInsert,
  operations,
  onInsertOperation,
}: Props) => (
  <Card size="small" title={title}>
    <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
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
          {variables.map((variable) => (
            <Tooltip
              key={variable.path}
              trigger={['hover', 'focus']}
              title={variable.description}
            >
              <Button
                htmlType="button"
                size="small"
                className={variableButton}
                aria-label={`Вставить переменную «${variable.label}»`}
                onClick={() => onInsert(variable)}
              >
                {variable.label}
                {variable.unit ? `, ${variable.unit}` : ''}
              </Button>
            </Tooltip>
          ))}
        </Flex>
      )}
    </Spin>
    {operations ? (
      <Flex wrap gap="small" className={operationButtons}>
        {operations.map((operation) => (
          <Tooltip key={operation.value} title={operation.description}>
            <Button
              htmlType="button"
              size="small"
              aria-label={`Вставить операцию «${operation.label}»`}
              onClick={() => onInsertOperation?.(operation.value)}
            >
              {operation.label}
            </Button>
          </Tooltip>
        ))}
      </Flex>
    ) : null}
  </Card>
);
