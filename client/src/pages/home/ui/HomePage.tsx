import { css } from '@emotion/css';
import { Alert, Table, Typography, type TableColumnsType } from 'antd';
import dayjs from 'dayjs';
import type { FC } from 'react';
import { Link, useNavigate } from 'react-router';

import {
  ORDER_STATUS,
  useOrderGroups,
  type Order,
  type OrderGroup,
} from '@entities/order';
import { DATE_DEFAULT_FORMAT } from '@shared/lib';

const pageStyles = css`
  padding: 24px;

  .ant-table-wrapper {
    margin-top: 16px;
  }
`;

const expandedTableStyles = css`
  margin: -8px 0;

  .ant-table {
    background: transparent;
  }
`;

const formatPrice = (price: number): string =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 2,
  }).format(price);

const formatDate = (date?: Date): string =>
  date ? dayjs(date).format(DATE_DEFAULT_FORMAT) : '—';

const getOrderPath = (group: OrderGroup): string =>
  group.status === ORDER_STATUS.DRAFT
    ? `/order/${group.id}/editing`
    : `/order/${group.id}`;

const documentColumns: TableColumnsType<Order> = [
  {
    title: 'Документ',
    dataIndex: 'name',
    render: (name: string | undefined, order) =>
      name?.trim() || `Документ ${order.id.slice(0, 8)}`,
  },
  {
    title: 'Цвет',
    dataIndex: ['characteristics', 'color', 'name'],
    render: (value?: string) => value || '—',
  },
  {
    title: 'Материал',
    dataIndex: ['characteristics', 'material', 'name'],
    render: (value?: string) => value || '—',
  },
  {
    title: 'Профиль',
    dataIndex: ['characteristics', 'profile', 'name'],
    render: (value?: string) => value || '—',
  },
  {
    title: 'Филёнка',
    dataIndex: ['characteristics', 'panel', 'name'],
    render: (value?: string) => value || '—',
  },
  {
    title: 'Патина',
    dataIndex: ['characteristics', 'patina', 'name'],
    render: (value?: string) => value || '—',
  },
  {
    title: 'Лак',
    dataIndex: ['characteristics', 'varnish', 'name'],
    render: (value?: string) => value || '—',
  },
  {
    title: 'Позиций',
    dataIndex: 'items',
    align: 'right',
    render: (items: Order['items']) => items?.length ?? 0,
  },
  {
    title: 'Сумма',
    dataIndex: 'totalPrice',
    align: 'right',
    render: (price: number) => formatPrice(Number(price) || 0),
  },
];

const orderColumns: TableColumnsType<OrderGroup> = [
  {
    title: '№',
    key: 'index',
    width: 64,
    align: 'right',
    render: (_value, _group, index) => index + 1,
  },
  {
    title: 'Номер заказа',
    dataIndex: 'orderNumber',
    render: (orderNumber: string, group) => (
      <Link to={getOrderPath(group)}>{orderNumber}</Link>
    ),
  },
  {
    title: 'Заказчик',
    dataIndex: ['customer', 'name'],
    render: (name?: string) => name || '—',
  },
  {
    title: 'Дата получения',
    dataIndex: 'startedAt',
    render: (date?: Date) => formatDate(date),
  },
  {
    title: 'Сумма',
    key: 'totalPrice',
    align: 'right',
    render: (_value, group) =>
      formatPrice(
        (group.orders ?? []).reduce(
          (total, order) => total + (Number(order.totalPrice) || 0),
          0,
        ),
      ),
  },
  {
    title: 'Документов',
    dataIndex: 'orders',
    align: 'right',
    render: (orders?: Order[]) => orders?.length ?? 0,
  },
];

export const HomePage: FC = () => {
  const navigate = useNavigate();
  const { data, error, isLoading } = useOrderGroups();
  const groups = data?.groups ?? [];

  return (
    <section className={pageStyles}>
      <Typography.Title
        css={{
          margin: 0,
        }}
        level={4}
      >
        Заказы
      </Typography.Title>
      {error ? (
        <Alert
          title="Не удалось загрузить список заказов"
          description="Обновите страницу или попробуйте позже."
          type="error"
          showIcon
        />
      ) : (
        <Table<OrderGroup>
          columns={orderColumns}
          dataSource={groups}
          loading={isLoading}
          locale={{ emptyText: 'Заказов пока нет' }}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          rowKey="id"
          onRow={(group) => ({
            onClick: (event) => {
              const target = event.target as HTMLElement;
              if (target.closest('a, button')) return;

              navigate(getOrderPath(group));
            },
            style: { cursor: 'pointer' },
          })}
          scroll={{ x: 900 }}
          size="small"
          expandable={{
            rowExpandable: (group) => (group.orders?.length ?? 0) > 0,
            expandedRowRender: (group) => (
              <Table<Order>
                className={expandedTableStyles}
                columns={documentColumns}
                dataSource={group.orders ?? []}
                pagination={false}
                rowKey="id"
                scroll={{ x: 1100 }}
                size="small"
              />
            ),
          }}
        />
      )}
    </section>
  );
};
