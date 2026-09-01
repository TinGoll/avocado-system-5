import { css } from '@emotion/css';
import { Empty, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { FC } from 'react';

import type { Order, OrderItem } from '@entities/order';
import { Field } from '@shared/ui';
import { MarkdownPreview } from '@shared/ui/markdown';

import {
  formatCurrency,
  formatDimensions,
  pricingMethodLabels,
} from '../model/orderInvoice';

const styles = {
  characteristics: css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
    gap: 0 16px;
    padding: 8px;
    padding-bottom: 0;
    border: 1px solid var(--app-devider-color);
    border-top: 0;

    @media (max-width: 640px) {
      grid-template-columns: minmax(0, 1fr);
    }
  `,
  fieldValue: css`
    cursor: default;

    &:hover {
      box-shadow: none;
    }
  `,
  fieldText: css`
    font-size: 14px;
  `,
  fullWidthField: css`
    grid-column: 1 / -1;
  `,
  table: css`
    border: 1px solid var(--app-devider-color);
    border-top: 0;
    border-bottom: 0;

    & .ant-table-small .ant-table-thead > tr > th,
    & .ant-table-small .ant-table-tbody > tr > td {
      padding: 3px 6px;
      line-height: 20px;
    }
  `,
  documentTotal: css`
    display: flex;
    justify-content: flex-end;
    align-items: baseline;
    gap: 12px;
    padding: 8px;
    border: 1px solid var(--app-devider-color);
    border-end-end-radius: 6px;
    border-end-start-radius: 6px;
    border-top: 0;
  `,
};

const characteristicName = (value?: { name: string }): string =>
  value?.name || '—';

const columns: ColumnsType<OrderItem> = [
  {
    title: '№',
    width: 56,
    align: 'center',
    render: (_, __, index) => index + 1,
  },
  {
    title: 'Наименование',
    render: (_, item) => item.snapshot?.name || item.template?.name || '—',
  },
  {
    title: 'Группа',
    dataIndex: ['template', 'group'],
    align: 'center',
    render: (group?: string) => group || '—',
  },
  {
    title: 'Размеры',
    width: 180,
    align: 'center',
    render: (_, item) =>
      formatDimensions(
        item.characteristics.width,
        item.characteristics.height,
        item.characteristics.thickness,
      ),
  },
  {
    title: 'Количество',
    align: 'center',
    dataIndex: 'quantity',
    width: 120,
  },
  {
    title: 'Единица',
    width: 100,
    align: 'center',
    render: (_, item) =>
      pricingMethodLabels[item.snapshot.customerPricingMethod],
  },
  {
    title: 'Сумма',
    dataIndex: 'calculatedCustomerPrice',
    width: 140,
    align: 'center',
    render: (price: number) => formatCurrency(price),
  },
  {
    title: 'Комментарий',
    dataIndex: ['characteristics', 'comment'],
    render: (comment?: string) => comment || '—',
  },
];

type Props = { order: Order };

export const OrderDocumentView: FC<Props> = ({ order }) => (
  <div className="order-invoice-print-area">
    <div className={styles.characteristics}>
      <Field>
        <Field.Label>
          <Typography.Text type="secondary">Материал</Typography.Text>
        </Field.Label>
        <Field.Value className={styles.fieldValue}>
          <Typography.Text className={styles.fieldText} type="success">
            {characteristicName(order.characteristics.material)}
          </Typography.Text>
        </Field.Value>
      </Field>
      <Field>
        <Field.Label>
          <Typography.Text type="secondary">Цвет</Typography.Text>
        </Field.Label>
        <Field.Value className={styles.fieldValue}>
          <Typography.Text className={styles.fieldText} type="success">
            {characteristicName(order.characteristics.color)}
          </Typography.Text>
        </Field.Value>
      </Field>
      <Field>
        <Field.Label>
          <Typography.Text type="secondary">Профиль</Typography.Text>
        </Field.Label>
        <Field.Value className={styles.fieldValue}>
          <Typography.Text className={styles.fieldText} type="success">
            {characteristicName(order.characteristics.profile)}
          </Typography.Text>
        </Field.Value>
      </Field>
      <Field>
        <Field.Label>
          <Typography.Text type="secondary">Филёнка</Typography.Text>
        </Field.Label>
        <Field.Value className={styles.fieldValue}>
          <Typography.Text className={styles.fieldText} type="success">
            {characteristicName(order.characteristics.panel)}
          </Typography.Text>
        </Field.Value>
      </Field>
      <Field>
        <Field.Label>
          <Typography.Text type="secondary">Патина</Typography.Text>
        </Field.Label>
        <Field.Value className={styles.fieldValue}>
          <Typography.Text className={styles.fieldText} type="success">
            {characteristicName(order.characteristics.patina)}
          </Typography.Text>
        </Field.Value>
      </Field>
      <Field>
        <Field.Label>
          <Typography.Text type="secondary">Лак</Typography.Text>
        </Field.Label>
        <Field.Value className={styles.fieldValue}>
          <Typography.Text className={styles.fieldText} type="success">
            {characteristicName(order.characteristics.varnish)}
          </Typography.Text>
        </Field.Value>
      </Field>
      <Field>
        <Field.Label>
          <Typography.Text type="secondary">Термошов</Typography.Text>
        </Field.Label>
        <Field.Value className={styles.fieldValue}>
          <Typography.Text className={styles.fieldText} type="success">
            {order.characteristics.thermalSeam ?? '—'}
          </Typography.Text>
        </Field.Value>
      </Field>
      <Field>
        <Field.Label>
          <Typography.Text type="secondary">Присадка</Typography.Text>
        </Field.Label>
        <Field.Value className={styles.fieldValue}>
          <Typography.Text className={styles.fieldText} type="success">
            {order.characteristics.drilling ?? '—'}
          </Typography.Text>
        </Field.Value>
      </Field>
      <Field className={styles.fullWidthField}>
        <Field.Label>
          <Typography.Text type="secondary">Комментарий</Typography.Text>
        </Field.Label>
        <Field.Value className={styles.fieldValue}>
          <MarkdownPreview className={styles.fieldText} value={order.comment} />
        </Field.Value>
      </Field>
    </div>
    <div className={styles.table}>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={order.items}
        pagination={false}
        locale={{
          emptyText: <Empty description="В документе пока нет позиций" />,
        }}
        scroll={{ x: 900 }}
        size="small"
      />
    </div>
    <div className={styles.documentTotal}>
      <Typography.Text type="secondary">Сумма документа</Typography.Text>
      <Typography.Title level={5} style={{ margin: 0 }}>
        {formatCurrency(order.totalPrice)}
      </Typography.Title>
    </div>
  </div>
);
