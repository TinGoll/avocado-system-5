import { ArrowRightOutlined, FileTextOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import {
  Alert,
  Table,
  Tag,
  Typography,
  theme,
  type TableColumnsType,
} from 'antd';
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

const orderRowStyles = css`
  cursor: pointer;
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

const documentCharacteristics = [
  ['color', 'Цвет'],
  ['material', 'Материал'],
  ['profile', 'Профиль'],
  ['panel', 'Филёнка'],
  ['patina', 'Патина'],
  ['varnish', 'Лак'],
] as const;

const OrderDocuments: FC<{ group: OrderGroup }> = ({ group }) => {
  const { token } = theme.useToken();
  const documents = group.orders ?? [];
  return (
    <section
      aria-label="Документы заказа"
      className={css`
        padding: 10px;
        border: 1px solid ${token.colorBorderSecondary};
        border-radius: ${token.borderRadiusLG}px;
        background: ${token.colorBgContainer};
        .documents-heading {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .documents-list {
          display: grid;
          gap: 6px;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .document-row {
          display: grid;
          grid-template-columns:
            minmax(150px, 1.5fr) repeat(6, minmax(80px, 1fr))
            65px minmax(110px, 1fr) 28px;
          align-items: center;
          padding: 8px 10px;
          border: 1px solid ${token.colorBorderSecondary};
          border-radius: ${token.borderRadius}px;
          background: ${token.colorFillAlter};
          gap: 10px;
        }
        .document-name {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          font-weight: 600;
          overflow-wrap: anywhere;
        }
        .document-icon {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 30px;
          height: 34px;
          border-radius: ${token.borderRadiusSM}px;
          background: ${token.colorFillSecondary};
          color: ${token.colorTextSecondary};
          font-size: 20px;
        }
        .document-field {
          margin: 0;
          padding-left: 10px;
          border-left: 1px solid ${token.colorBorderSecondary};
          min-width: 0;
          overflow-wrap: anywhere;
        }
        dt {
          color: ${token.colorTextSecondary};
          font-size: 11px;
          margin-bottom: 2px;
        }
        dd {
          margin: 0;
        }
        .document-price {
          white-space: nowrap;
        }
        .document-link {
          display: grid;
          place-items: center;
          width: 28px;
          height: 28px;
          border-radius: ${token.borderRadiusSM}px;
        }
        .document-link:hover {
          background: ${token.colorFillSecondary};
        }
      `}
    >
      <div className="documents-heading">
        <Typography.Text strong>Документы заказа</Typography.Text>
        <Tag>{documents.length}</Tag>
      </div>
      <ul className="documents-list">
        {documents.map((document) => {
          const name =
            document.name?.trim() || `Документ ${document.documentNumber}`;
          return (
            <li className="document-row" key={document.id}>
              <div className="document-name">
                <span className="document-icon">
                  <FileTextOutlined />
                </span>
                {name}
              </div>
              {documentCharacteristics.map(([key, label]) => (
                <dl className="document-field" key={key}>
                  <dt>{label}</dt>
                  <dd>{document.characteristics?.[key]?.name || '—'}</dd>
                </dl>
              ))}
              <dl className="document-field">
                <dt>Позиций</dt>
                <dd>{document.items?.length ?? 0}</dd>
              </dl>
              <dl className="document-field document-price">
                <dt>Сумма</dt>
                <dd>{formatPrice(Number(document.totalPrice) || 0)}</dd>
              </dl>
              <Link
                className="document-link"
                to={`${getOrderPath(group)}?document=${document.documentNumber}`}
                aria-label={`Открыть ${name}`}
                title={`Открыть ${name}`}
              >
                <ArrowRightOutlined />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

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
          rowClassName={orderRowStyles}
          onRow={(group) => ({
            onClick: (event) => {
              const target = event.target as HTMLElement;
              if (target.closest('a, button')) return;

              navigate(getOrderPath(group));
            },
          })}
          scroll={{ x: 1200 }}
          size="small"
          expandable={{
            rowExpandable: (group) => (group.orders?.length ?? 0) > 0,
            expandedRowRender: (group) => <OrderDocuments group={group} />,
          }}
        />
      )}
    </section>
  );
};
