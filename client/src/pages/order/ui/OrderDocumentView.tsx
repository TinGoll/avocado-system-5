import { css } from "@emotion/css";
import { Descriptions, Empty, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { FC } from "react";

import type { Order, OrderItem } from "@entities/order";

import {
  formatCurrency,
  formatDimensions,
  pricingMethodLabels,
} from "../model/orderInvoice";

const styles = {
  characteristics: css`
    padding: 8px;
    border: 1px solid var(--app-devider-color);
    border-top: 0;
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
  value?.name || "—";

const columns: ColumnsType<OrderItem> = [
  {
    title: "№",
    width: 56,
    align: "center",
    render: (_, __, index) => index + 1,
  },
  {
    title: "Наименование",
    render: (_, item) => item.snapshot?.name || item.template?.name || "—",
  },
  {
    title: "Группа",
    dataIndex: ["template", "group"],
    align: "center",
    render: (group?: string) => group || "—",
  },
  {
    title: "Размеры",
    width: 180,
    align: "center",
    render: (_, item) =>
      formatDimensions(
        item.characteristics.width,
        item.characteristics.height,
        item.characteristics.thickness,
      ),
  },
  {
    title: "Количество",
    align: "center",
    dataIndex: "quantity",
    width: 120,
  },
  {
    title: "Единица",
    width: 100,
    align: "center",
    render: (_, item) =>
      pricingMethodLabels[item.snapshot.customerPricingMethod],
  },
  {
    title: "Сумма",
    dataIndex: "calculatedCustomerPrice",
    width: 140,
    align: "center",
    render: (price: number) => formatCurrency(price),
  },
  {
    title: "Комментарий",
    dataIndex: ["characteristics", "comment"],
    render: (comment?: string) => comment || "—",
  },
];

type Props = { order: Order };

export const OrderDocumentView: FC<Props> = ({ order }) => (
  <div className="order-invoice-print-area">
    <Descriptions
      className={styles.characteristics}
      column={{ xs: 1, sm: 2, lg: 3 }}
      size="small"
      items={[
        {
          key: "material",
          label: "Материал",
          children: characteristicName(order.characteristics.material),
        },
        {
          key: "color",
          label: "Цвет",
          children: characteristicName(order.characteristics.color),
        },
        {
          key: "profile",
          label: "Профиль",
          children: characteristicName(order.characteristics.profile),
        },
        {
          key: "panel",
          label: "Филёнка",
          children: characteristicName(order.characteristics.panel),
        },
        {
          key: "patina",
          label: "Патина",
          children: characteristicName(order.characteristics.patina),
        },
        {
          key: "varnish",
          label: "Лак",
          children: characteristicName(order.characteristics.varnish),
        },
      ]}
    />
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
