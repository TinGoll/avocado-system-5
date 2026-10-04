import { css } from '@emotion/css';
import {
  Alert,
  Button,
  Card,
  Empty,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { isAxiosError } from 'axios';
import { type FC, type ReactNode, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';

import {
  type FinanceDialogAction,
  FinanceMutationModals,
} from '@features/record-payment';
import type {
  CustomerFinanceHistoryItem,
  CustomerFinanceOrder,
} from '@shared/api';

import {
  useCustomerFinanceHistory,
  useCustomerFinancePage,
} from '../api/customer-finance';

const styles = {
  page: css`
    width: 100%;
    max-width: 1440px;
    box-sizing: border-box;
    margin: 0 auto;
    padding: 24px;
    @media (max-width: 720px) {
      padding: 12px;
    }
  `,
  content: css`
    width: 100%;
    min-width: 0;
    > .ant-space-item {
      min-width: 0;
      width: 100%;
    }
  `,
  header: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    @media (max-width: 600px) {
      flex-direction: column;
    }
  `,
  title: css`
    && {
      margin: 4px 0;
    }
  `,
  muted: css`
    color: rgba(0, 0, 0, 0.55);
  `,
  summary: css`
    display: grid;
    grid-template-columns: repeat(4, minmax(160px, 1fr));
    gap: 12px;
    @media (max-width: 900px) {
      grid-template-columns: repeat(2, minmax(150px, 1fr));
    }
    @media (max-width: 500px) {
      grid-template-columns: 1fr;
    }
  `,
  sectionTitle: css`
    && {
      margin: 0 0 12px;
    }
  `,
  center: css`
    display: flex;
    min-height: 220px;
    align-items: center;
    justify-content: center;
  `,
  detail: css`
    display: grid;
    gap: 6px;
    padding: 8px 16px;
  `,
};

const moneyMinor = (value: string) => {
  const [rubles = '0', kopecks = ''] = value.split('.');
  return Number(rubles) * 100 + Number(kopecks.padEnd(2, '0').slice(0, 2));
};
const money = (minor: number) => (minor / 100).toFixed(2);
const dateTime = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));

const orderStatus: Record<CustomerFinanceOrder['systemStatus'], string> = {
  draft: 'Черновик',
  in_production: 'В работе',
  completed: 'Закрыт',
  cancelled: 'Отменён',
};
const financialStatus: Record<CustomerFinanceOrder['financialStatus'], string> =
  {
    unpaid: 'Не оплачен',
    partially_paid: 'Оплачен менее 50%',
    prepaid: 'Предоплата',
    paid: 'Оплачен',
  };

const State: FC<{
  loading: boolean;
  error: unknown;
  empty?: boolean;
  emptyText?: string;
  retry: () => unknown;
  children: ReactNode;
}> = ({ loading, error, empty, emptyText, retry, children }) => {
  if (loading)
    return (
      <div className={styles.center}>
        <Spin aria-label="Загрузка финансов заказчика" />
      </div>
    );
  if (error)
    return (
      <Alert
        showIcon
        type="error"
        title="Не удалось загрузить данные"
        action={<Button onClick={() => void retry()}>Повторить</Button>}
      />
    );
  if (empty) return <Empty description={emptyText} />;
  return children;
};

export const CustomerFinancePage: FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const finance = useCustomerFinancePage(customerId);
  const history = useCustomerFinanceHistory(customerId);
  const [dialogAction, setDialogAction] = useState<FinanceDialogAction | null>(
    null,
  );
  const totals = useMemo(() => {
    const orders = finance.data?.orders ?? [];
    return {
      total: money(
        orders.reduce((sum, item) => sum + moneyMinor(item.total), 0),
      ),
      paid: money(orders.reduce((sum, item) => sum + moneyMinor(item.paid), 0)),
      debt: money(orders.reduce((sum, item) => sum + moneyMinor(item.debt), 0)),
    };
  }, [finance.data?.orders]);
  const openPayment = () => {
    if (!finance.data) return;
    setDialogAction({
      type: 'payment',
      customerId: finance.data.customer.id,
    });
  };

  if (isAxiosError(finance.error) && finance.error.response?.status === 404)
    return (
      <section className={styles.page}>
        <Empty description="Заказчик не найден">
          <Link to="/finance?tab=customers">Вернуться к финансам</Link>
        </Empty>
      </section>
    );

  return (
    <section className={styles.page}>
      <State
        loading={finance.isLoading}
        error={finance.error}
        retry={finance.mutate}
      >
        {finance.data ? (
          <Space className={styles.content} orientation="vertical" size="large">
            <div className={styles.header}>
              <div>
                <Link to="/finance?tab=customers">← Финансы</Link>
                <Typography.Title className={styles.title} level={2}>
                  {finance.data.customer.name}
                </Typography.Title>
                {(finance.data.customer.companyName ||
                  finance.data.customer.city) && (
                  <Typography.Text className={styles.muted}>
                    {[
                      finance.data.customer.companyName,
                      finance.data.customer.city,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Typography.Text>
                )}
              </div>
              <Button type="primary" onClick={openPayment}>
                Внести оплату
              </Button>
            </div>

            <div className={styles.summary}>
              <Card size="small">
                <Statistic
                  title="Нераспределённый баланс"
                  value={finance.data.unallocatedBalance}
                  suffix="₽"
                />
              </Card>
              <Card size="small">
                <Statistic
                  title="Стоимость заказов"
                  value={totals.total}
                  suffix="₽"
                />
              </Card>
              <Card size="small">
                <Statistic
                  title="Распределено"
                  value={totals.paid}
                  suffix="₽"
                />
              </Card>
              <Card size="small">
                <Statistic title="Долг" value={totals.debt} suffix="₽" />
              </Card>
            </div>

            <div>
              <Typography.Title className={styles.sectionTitle} level={4}>
                Заказы
              </Typography.Title>
              <State
                loading={false}
                error={undefined}
                empty={!finance.data.orders.length}
                emptyText="У заказчика пока нет заказов"
                retry={finance.mutate}
              >
                <Table<CustomerFinanceOrder>
                  rowKey="id"
                  pagination={false}
                  scroll={{ x: 900 }}
                  dataSource={finance.data.orders}
                  columns={[
                    {
                      title: 'Заказ',
                      render: (_, item) => (
                        <Link to={`/order/${item.id}`}>
                          {item.orderNumber || item.name}
                        </Link>
                      ),
                    },
                    {
                      title: 'Создан',
                      dataIndex: 'createdAt',
                      render: dateTime,
                    },
                    {
                      title: 'Статус',
                      render: (_, item) => (
                        <Tag>{orderStatus[item.systemStatus]}</Tag>
                      ),
                    },
                    { title: 'Стоимость', dataIndex: 'total' },
                    { title: 'Распределено', dataIndex: 'paid' },
                    { title: 'Долг', dataIndex: 'debt' },
                    {
                      title: 'Оплата',
                      render: (_, item) =>
                        financialStatus[item.financialStatus],
                    },
                  ]}
                />
              </State>
            </div>

            <div>
              <Typography.Title className={styles.sectionTitle} level={4}>
                История
              </Typography.Title>
              <State
                loading={history.isLoading}
                error={history.error}
                empty={!history.data?.items.length}
                emptyText="Финансовых операций пока нет"
                retry={history.mutate}
              >
                <Table<CustomerFinanceHistoryItem>
                  rowKey={(item) => `${item.type}-${item.id}`}
                  pagination={false}
                  scroll={{ x: 760 }}
                  dataSource={history.data?.items ?? []}
                  expandable={{
                    rowExpandable: (item) => item.details.length > 0,
                    expandedRowRender: (item) => (
                      <div className={styles.detail}>
                        {item.details.map((detail) => (
                          <span
                            key={`${detail.orderGroupId}-${detail.orderNumber}-${detail.amount}`}
                          >
                            {detail.orderNumber ?? 'Без заказа'}:{' '}
                            {detail.amount} ₽
                          </span>
                        ))}
                      </div>
                    ),
                  }}
                  columns={[
                    { title: 'Дата', dataIndex: 'createdAt', render: dateTime },
                    {
                      title: 'Операция',
                      render: (_, item) =>
                        item.operationId ? (
                          <Link to={`/finance/allocations/${item.operationId}`}>
                            {item.description}
                          </Link>
                        ) : (
                          item.description
                        ),
                    },
                    { title: 'Сумма', dataIndex: 'amount' },
                    { title: 'Комментарий', dataIndex: 'comment' },
                    { title: 'Сотрудник', dataIndex: 'employee' },
                  ]}
                />
              </State>
            </div>

            <FinanceMutationModals
              action={dialogAction}
              customers={[finance.data.customer]}
              onClose={() => setDialogAction(null)}
            />
          </Space>
        ) : null}
      </State>
    </section>
  );
};
