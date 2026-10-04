import { css } from '@emotion/css';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Spin,
  Table,
  Typography,
} from 'antd';
import { isAxiosError } from 'axios';
import type { FC } from 'react';
import { Link, useParams } from 'react-router';

import { formatFinanceMoney } from '@entities/finance';

import { useFinanceAllocationResult } from '../api/finance-allocation-result';

const styles = {
  page: css`
    width: 100%;
    box-sizing: border-box;
    padding: 16px;
  `,
  center: css`
    display: flex;
    min-height: 240px;
    align-items: center;
    justify-content: center;
  `,
  title: css`
    && {
      margin: 16px 0;
    }
  `,
  card: css`
    margin-bottom: 20px;
  `,
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));

export const FinanceAllocationResultPage: FC = () => {
  const rawId = useParams<{ operationId: string }>().operationId;
  const operationId = rawId && /^\d+$/.test(rawId) ? Number(rawId) : null;
  const result = useFinanceAllocationResult(operationId);

  if (!operationId)
    return (
      <section className={styles.page}>
        <Empty description="Некорректный номер распределения" />
      </section>
    );
  if (result.isLoading)
    return (
      <div className={styles.center}>
        <Spin aria-label="Загрузка результата распределения" />
      </div>
    );
  if (isAxiosError(result.error) && result.error.response?.status === 404)
    return (
      <section className={styles.page}>
        <Empty description="Распределение не найдено" />
      </section>
    );
  if (result.error)
    return (
      <section className={styles.page}>
        <Alert
          showIcon
          type="error"
          title="Не удалось загрузить результат распределения"
          action={
            <Button onClick={() => void result.mutate()}>Повторить</Button>
          }
        />
      </section>
    );
  if (!result.data) return null;

  return (
    <section className={styles.page}>
      <Link to={`/finance/customers/${result.data.customer.id}`}>
        ← Финансы заказчика
      </Link>
      <Typography.Title className={styles.title} level={2}>
        {result.data.number}
      </Typography.Title>
      <Card className={styles.card}>
        <Descriptions column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="Заказчик">
            {[result.data.customer.name, result.data.customer.companyName]
              .filter(Boolean)
              .join(' · ')}
          </Descriptions.Item>
          <Descriptions.Item label="Распределено">
            {formatFinanceMoney(result.data.total)}
          </Descriptions.Item>
          <Descriptions.Item label="Остаток">
            {formatFinanceMoney(result.data.balanceAfter)}
          </Descriptions.Item>
          <Descriptions.Item label="Дата и время">
            {formatDateTime(result.data.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Сотрудник">
            {result.data.employee ?? 'Не указан'}
          </Descriptions.Item>
          <Descriptions.Item label="Комментарий">
            {result.data.comment ?? '—'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
      <Typography.Title level={4}>Заказы</Typography.Title>
      <Table
        rowKey="accrualId"
        pagination={false}
        scroll={{ x: 620 }}
        dataSource={result.data.orders}
        columns={[
          {
            title: 'Заказ',
            render: (_, item) => (
              <Link to={`/order/${item.orderGroupId}`}>{item.orderNumber}</Link>
            ),
          },
          {
            title: 'Распределено',
            dataIndex: 'allocated',
            render: formatFinanceMoney,
          },
          {
            title: 'Новый долг',
            dataIndex: 'newDebt',
            render: formatFinanceMoney,
          },
        ]}
      />
      <Link to={`/finance/customers/${result.data.customer.id}`}>
        <Button>Вернуться к финансам заказчика</Button>
      </Link>
    </section>
  );
};
