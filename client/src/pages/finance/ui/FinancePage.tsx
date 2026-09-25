import { css } from '@emotion/css';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { type FC, type ReactNode, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import useSWR from 'swr';

import {
  type FinanceAccrual,
  type FinanceCustomerListItem,
  type FinancePayment,
  getFinanceCustomer,
  getFinancePayment,
} from '@shared/api';

import {
  financeKeys,
  useCustomerLinkIssues,
  useFinanceAccruals,
  useFinanceCustomers,
  useFinancePayments,
  useFinanceSummary,
} from '../api/finance-data';
import {
  accrualStateLabel,
  allocationStateLabel,
  formatFinanceDate,
  formatFinanceMoney,
  paymentMethodLabel,
} from '../model/finance-display';

import {
  type FinanceDialogAction,
  FinanceMutationModals,
} from './FinanceMutationModals';

const styles = {
  page: css`
    width: 100%;
    max-width: 1440px;
    box-sizing: border-box;
    margin: 0 auto;
    padding: 24px;
    overflow-x: hidden;
    @media (max-width: 720px) {
      padding: 12px;
    }
  `,
  header: css`
    width: 100%;
    min-width: 0;
    > .ant-space-item {
      min-width: 0;
      max-width: 100%;
    }
    .ant-tabs {
      width: 100%;
      min-width: 0;
    }
  `,
  title: css`
    && {
      margin: 0;
    }
  `,
  summary: css`
    display: grid;
    grid-template-columns: repeat(5, minmax(160px, 1fr));
    gap: 12px;
    @media (max-width: 980px) {
      grid-template-columns: repeat(2, minmax(150px, 1fr));
    }
    @media (max-width: 520px) {
      grid-template-columns: 1fr;
    }
  `,
  table: css`
    width: 100%;
  `,
  tableFooter: css`
    display: flex;
    justify-content: center;
    margin-top: 16px;
  `,
  selectedRow: css`
    cursor: pointer;
  `,
};

const LoadState: FC<{
  loading: boolean;
  error: unknown;
  empty: boolean;
  emptyText: string;
  retry: () => unknown;
  children: ReactNode;
}> = ({ loading, error, empty, emptyText, retry, children }) => {
  if (loading) return <Spin aria-label="Загрузка финансовых данных" />;
  if (error)
    return (
      <Alert
        showIcon
        type="error"
        title="Не удалось загрузить финансовые данные"
        action={<Button onClick={() => void retry()}>Повторить</Button>}
      />
    );
  if (empty) return <Empty description={emptyText} />;
  return children;
};

const PaymentAllocations: FC<{ paymentId: string }> = ({ paymentId }) => {
  const { data, error, isLoading, mutate } = useSWR(
    `finance/payments/${paymentId}`,
    () => getFinancePayment(paymentId),
  );
  return (
    <LoadState
      loading={isLoading}
      error={error}
      empty={!data?.allocations.length}
      emptyText="Распределений нет — сумма является авансом"
      retry={mutate}
    >
      <Table
        pagination={false}
        rowKey="id"
        size="small"
        dataSource={data?.allocations ?? []}
        columns={[
          { title: 'Начисление', dataIndex: 'accrualId' },
          {
            title: 'Сумма',
            dataIndex: 'amount',
            render: (value: string) => formatFinanceMoney(value),
          },
          {
            title: 'Состояние',
            dataIndex: 'status',
            render: (value: 'active' | 'released') =>
              value === 'active' ? (
                <Tag color="green">Активно</Tag>
              ) : (
                <Tag>Освобождено</Tag>
              ),
          },
          { title: 'Причина освобождения', dataIndex: 'releaseReason' },
        ]}
      />
    </LoadState>
  );
};

const PaymentsTable: FC<{
  search: string;
  customerId?: string;
  onAction: (action: FinanceDialogAction) => void;
}> = ({ search, customerId, onAction }) => {
  const page = useFinancePayments({ search, customerId, limit: 30 });
  return (
    <LoadState
      loading={page.isLoading}
      error={page.error}
      empty={!page.items.length}
      emptyText="Оплат пока нет"
      retry={page.retry}
    >
      <Table<FinancePayment>
        className={styles.table}
        pagination={false}
        rowKey="id"
        scroll={{ x: 980 }}
        dataSource={page.items}
        expandable={{
          expandedRowRender: (item) => (
            <PaymentAllocations paymentId={item.id} />
          ),
          rowExpandable: () => true,
        }}
        columns={[
          {
            title: 'Дата',
            dataIndex: 'businessDate',
            render: formatFinanceDate,
          },
          { title: 'Заказчик', dataIndex: 'customerName' },
          {
            title: 'Способ',
            dataIndex: 'method',
            render: (value: FinancePayment['method']) =>
              paymentMethodLabel[value],
          },
          {
            title: 'Сумма',
            dataIndex: 'amount',
            render: formatFinanceMoney,
          },
          {
            title: 'Распределено',
            dataIndex: 'allocated',
            render: formatFinanceMoney,
          },
          {
            title: 'Остаток',
            dataIndex: 'unallocated',
            render: formatFinanceMoney,
          },
          {
            title: 'Статус',
            key: 'status',
            render: (_, item) =>
              item.status === 'cancelled' ? (
                <Tag>Аннулировано</Tag>
              ) : (
                <Tag color="blue">
                  {allocationStateLabel[item.allocationState]}
                </Tag>
              ),
          },
          {
            title: 'Действия',
            key: 'actions',
            render: (_, item) =>
              item.status === 'posted' ? (
                <Space>
                  <Button
                    size="small"
                    onClick={() =>
                      onAction({ type: 'allocations', payment: item })
                    }
                  >
                    Распределить
                  </Button>
                  <Button
                    danger
                    size="small"
                    onClick={() =>
                      onAction({ type: 'cancel-payment', payment: item })
                    }
                  >
                    Аннулировать
                  </Button>
                </Space>
              ) : null,
          },
        ]}
      />
      {page.nextCursor && (
        <div className={styles.tableFooter}>
          <Button
            loading={page.loadingMore}
            onClick={() => void page.loadMore()}
          >
            Загрузить ещё
          </Button>
        </div>
      )}
    </LoadState>
  );
};

const AccrualsTable: FC<{
  search: string;
  customerId?: string;
  onAction: (action: FinanceDialogAction) => void;
}> = ({ search, customerId, onAction }) => {
  const page = useFinanceAccruals({ search, customerId, limit: 30 });
  return (
    <LoadState
      loading={page.isLoading}
      error={page.error}
      empty={!page.items.length}
      emptyText="Начислений пока нет"
      retry={page.retry}
    >
      <Table<FinanceAccrual>
        pagination={false}
        rowKey="id"
        scroll={{ x: 1000 }}
        dataSource={page.items}
        columns={[
          {
            title: 'Дата',
            dataIndex: 'businessDate',
            render: formatFinanceDate,
          },
          { title: 'Заказчик', dataIndex: 'customerName' },
          {
            title: 'Источник',
            dataIndex: 'sourceType',
            render: (value: FinanceAccrual['sourceType']) =>
              value === 'order' ? 'Заказ' : 'Вручную',
          },
          {
            title: 'Заказ / услуга',
            key: 'title',
            render: (_, item) =>
              item.orderGroupId ? (
                <Link to={`/order/${item.orderGroupId}`}>
                  {item.orderNumber ?? item.title}
                </Link>
              ) : (
                item.title
              ),
          },
          {
            title: 'Сумма',
            dataIndex: 'amount',
            render: formatFinanceMoney,
          },
          {
            title: 'Оплачено',
            dataIndex: 'allocated',
            render: formatFinanceMoney,
          },
          {
            title: 'Остаток',
            dataIndex: 'remaining',
            render: formatFinanceMoney,
          },
          {
            title: 'Состояние',
            dataIndex: 'state',
            render: (value: FinanceAccrual['state']) => (
              <Tag color={value === 'paid' ? 'green' : undefined}>
                {accrualStateLabel[value]}
              </Tag>
            ),
          },
          {
            title: 'Действия',
            key: 'actions',
            render: (_, item) =>
              item.status === 'active' ? (
                <Space>
                  {item.sourceType === 'order' && (
                    <Button
                      size="small"
                      onClick={() =>
                        onAction({ type: 'sync-accrual', accrual: item })
                      }
                    >
                      Обновить
                    </Button>
                  )}
                  <Button
                    size="small"
                    onClick={() =>
                      onAction({ type: 'adjust-accrual', accrual: item })
                    }
                  >
                    Корректировать
                  </Button>
                  <Button
                    danger
                    size="small"
                    onClick={() =>
                      onAction({ type: 'cancel-accrual', accrual: item })
                    }
                  >
                    Аннулировать
                  </Button>
                </Space>
              ) : null,
          },
        ]}
      />
      {page.nextCursor && (
        <div className={styles.tableFooter}>
          <Button
            loading={page.loadingMore}
            onClick={() => void page.loadMore()}
          >
            Загрузить ещё
          </Button>
        </div>
      )}
    </LoadState>
  );
};

const CustomerOperations: FC<{ customerId: string }> = ({ customerId }) => {
  const { data, error, isLoading, mutate } = useSWR(
    financeKeys.customer(customerId),
    () => getFinanceCustomer(customerId),
  );
  return (
    <LoadState
      loading={isLoading}
      error={error}
      empty={!data?.recentOperations.length}
      emptyText="Операций нет"
      retry={mutate}
    >
      <Table
        pagination={false}
        rowKey={(item) => `${item.kind}-${item.id}-${item.businessDate}`}
        size="small"
        dataSource={data?.recentOperations ?? []}
        columns={[
          {
            title: 'Дата',
            dataIndex: 'businessDate',
            render: formatFinanceDate,
          },
          { title: 'Операция', dataIndex: 'title' },
          { title: 'Сумма', dataIndex: 'amount', render: formatFinanceMoney },
        ]}
      />
    </LoadState>
  );
};

const CustomersTable: FC<{
  search: string;
  selectedId?: string;
  onSelect: (id: string) => void;
}> = ({ search, selectedId, onSelect }) => {
  const { data, error, isLoading, mutate } = useFinanceCustomers(search);
  const items = data?.items ?? [];
  return (
    <LoadState
      loading={isLoading}
      error={error}
      empty={!items.length}
      emptyText="Заказчиков с финансовыми данными нет"
      retry={mutate}
    >
      <Table<FinanceCustomerListItem>
        pagination={false}
        rowKey="id"
        scroll={{ x: 720 }}
        dataSource={items}
        expandable={{
          expandedRowKeys: selectedId ? [selectedId] : [],
          expandedRowRender: (item) => (
            <CustomerOperations customerId={item.id} />
          ),
          onExpand: (expanded, item) => expanded && onSelect(item.id),
        }}
        onRow={(item) => ({
          className: styles.selectedRow,
          onClick: () => onSelect(item.id),
        })}
        columns={[
          {
            title: 'Заказчик',
            key: 'customer',
            render: (_, item) => item.companyName ?? item.name,
          },
          { title: 'Долг', dataIndex: 'debt', render: formatFinanceMoney },
          { title: 'Аванс', dataIndex: 'advance', render: formatFinanceMoney },
          {
            title: 'Не распределено',
            dataIndex: 'unallocated',
            render: formatFinanceMoney,
          },
        ]}
      />
    </LoadState>
  );
};

export const FinancePage: FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'payments';
  const search = params.get('search') ?? '';
  const customerId = params.get('customerId') ?? undefined;
  const summary = useFinanceSummary();
  const issues = useCustomerLinkIssues();
  const customers = useFinanceCustomers('');
  const [dialogAction, setDialogAction] = useState<FinanceDialogAction | null>(
    null,
  );

  const updateParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <section className={styles.page}>
      <Space className={styles.header} orientation="vertical" size="large">
        <Typography.Title className={styles.title} level={3}>
          Финансы
        </Typography.Title>
        {issues.data?.items.length ? (
          <Alert
            showIcon
            type="warning"
            title={`Заказы без связи с заказчиком: ${issues.data.items.length}`}
            description={issues.data.items
              .slice(0, 5)
              .map((item) => item.orderNumber)
              .join(', ')}
          />
        ) : null}
        <LoadState
          loading={summary.isLoading}
          error={summary.error}
          empty={false}
          emptyText=""
          retry={summary.mutate}
        >
          <div className={styles.summary}>
            {[
              ['Начислено', summary.data?.accrued],
              ['Оплачено', summary.data?.paid],
              ['Долг', summary.data?.debt],
              ['Аванс', summary.data?.advance],
              ['Не распределено', summary.data?.unallocated],
            ].map(([title, value]) => (
              <Card key={title} size="small">
                <Statistic title={title} value={value ?? '0.00'} suffix="₽" />
              </Card>
            ))}
          </div>
        </LoadState>
        <Input.Search
          allowClear
          aria-label="Поиск по финансам"
          defaultValue={search}
          placeholder="Заказчик, заказ, услуга, комментарий…"
          onSearch={(value) => updateParam('search', value.trim())}
        />
        <Space wrap>
          <Button
            type="primary"
            onClick={() => setDialogAction({ type: 'payment' })}
          >
            Добавить оплату
          </Button>
          <Button onClick={() => setDialogAction({ type: 'manual-accrual' })}>
            Добавить начисление
          </Button>
        </Space>
        {customerId && (
          <Button onClick={() => updateParam('customerId')}>
            Сбросить фильтр заказчика
          </Button>
        )}
        <Tabs
          activeKey={tab}
          onChange={(value) => updateParam('tab', value)}
          items={[
            {
              key: 'payments',
              label: 'Оплаты',
              children: (
                <PaymentsTable
                  search={search}
                  customerId={customerId}
                  onAction={setDialogAction}
                />
              ),
            },
            {
              key: 'accruals',
              label: 'Начисления',
              children: (
                <AccrualsTable
                  search={search}
                  customerId={customerId}
                  onAction={setDialogAction}
                />
              ),
            },
            {
              key: 'customers',
              label: 'По заказчикам',
              children: (
                <CustomersTable
                  search={search}
                  selectedId={customerId}
                  onSelect={(id) => updateParam('customerId', id)}
                />
              ),
            },
          ]}
        />
        <FinanceMutationModals
          action={dialogAction}
          customers={customers.data?.items ?? []}
          onClose={() => setDialogAction(null)}
        />
      </Space>
    </section>
  );
};
