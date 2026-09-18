import {
  BgColorsOutlined,
  BorderOutlined,
  BuildOutlined,
  CalendarOutlined,
  CommentOutlined,
  FireOutlined,
  FormatPainterOutlined,
  HighlightOutlined,
  ProfileOutlined,
  TagsOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { css } from '@emotion/css';
import { Empty, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { FC, ReactNode } from 'react';

import type { Order, OrderItem } from '@entities/order';
import { ChangeOrderManagementForm } from '@features/change-order-management';
import { MarkdownPreview } from '@shared/ui/markdown';

import {
  formatCurrency,
  formatDimensions,
  pricingMethodLabels,
} from '../model/orderInvoice';

const styles = {
  header: css`
    border: 1px solid #303a46;
    border-top: none;
    border-radius: 0 8px 0 0;
    background: #141414;
  `,
  management: css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 8px;
    padding: 8px;
    border-bottom: 1px solid #303a46;

    @media (max-width: 640px) {
      grid-template-columns: minmax(0, 1fr);
    }
  `,
  characteristics: css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 8px;
    padding: 8px;

    @media (max-width: 640px) {
      grid-template-columns: minmax(0, 1fr);
    }
  `,
  characteristic: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 8px;
    border: 1px solid #2d3841;
    border-radius: 8px;
  `,
  characteristicIcon: css`
    display: grid;
    flex: 0 0 34px;
    width: 34px;
    height: 34px;
    place-items: center;
    border: 1px solid #2b353d;
    border-radius: 8px;
    color: #d9e0e5;
    background: linear-gradient(145deg, #283139, #1a2025);
    font-size: 16px;
  `,
  characteristicContent: css`
    min-width: 0;
  `,
  characteristicLabel: css`
    overflow: hidden;
    color: #8794a0;
    font-size: 12px;
    line-height: 1.1;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  characteristicValue: css`
    overflow: hidden;
    color: #edf1f4;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
    text-overflow: ellipsis;
    white-space: nowrap;

    .ant-typography {
      color: inherit;
      font-size: inherit;
      font-weight: inherit;
    }
  `,
  comment: css`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin: 0 8px 8px;
    padding: 8px;
    border: 1px solid #303a46;
    border-radius: 8px;
  `,
  commentIcon: css`
    flex: none;
    margin-top: 2px;
    color: #91a0ac;
    font-size: 18px;
  `,
  commentLabel: css`
    flex: none;
    min-width: 124px;
    color: #8794a0;
    font-weight: 600;
  `,
  fieldText: css`
    min-width: 0;
    color: #d5dbe0;
    font-size: 14px;

    p:last-child {
      margin-bottom: 0;
    }
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

type CharacteristicProps = {
  icon: ReactNode;
  label: string;
  value: ReactNode;
};

const Characteristic: FC<CharacteristicProps> = ({ icon, label, value }) => (
  <div className={styles.characteristic}>
    <div className={styles.characteristicIcon}>{icon}</div>
    <div className={styles.characteristicContent}>
      <div className={styles.characteristicLabel}>{label}</div>
      <div className={styles.characteristicValue}>{value}</div>
    </div>
  </div>
);

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

type Props = { order: Order; groupId: number };

export const OrderDocumentView: FC<Props> = ({ order, groupId }) => (
  <>
    <div className="order-invoice-print-area">
      <div className={styles.header}>
        <div className={styles.management}>
          <Characteristic
            icon={<CalendarOutlined />}
            label="Срок документа"
            value={
              <ChangeOrderManagementForm
                field="dueDate"
                groupId={groupId}
                hideLabel
                scope="document"
                targetId={order.id}
              />
            }
          />
          <Characteristic
            icon={<TagsOutlined />}
            label="Отметка документа"
            value={
              <ChangeOrderManagementForm
                field="status"
                groupId={groupId}
                hideLabel
                scope="document"
                targetId={order.id}
              />
            }
          />
        </div>
        <div className={styles.characteristics}>
          {order.characteristics.material !== undefined && (
            <Characteristic
              icon={<BuildOutlined />}
              label="Материал"
              value={characteristicName(order.characteristics.material)}
            />
          )}
          {order.characteristics.color !== undefined && (
            <Characteristic
              icon={<BgColorsOutlined />}
              label="Цвет"
              value={characteristicName(order.characteristics.color)}
            />
          )}
          {order.characteristics.profile !== undefined && (
            <Characteristic
              icon={<ProfileOutlined />}
              label="Профиль"
              value={characteristicName(order.characteristics.profile)}
            />
          )}
          {order.characteristics.panel !== undefined && (
            <Characteristic
              icon={<BorderOutlined />}
              label="Филёнка"
              value={characteristicName(order.characteristics.panel)}
            />
          )}
          {order.characteristics.patina !== undefined && (
            <Characteristic
              icon={<HighlightOutlined />}
              label="Патина"
              value={characteristicName(order.characteristics.patina)}
            />
          )}
          {order.characteristics.varnish !== undefined && (
            <Characteristic
              icon={<FormatPainterOutlined />}
              label="Лак"
              value={characteristicName(order.characteristics.varnish)}
            />
          )}
          {order.characteristics.thermalSeam !== undefined && (
            <Characteristic
              icon={<FireOutlined />}
              label="Термошов"
              value={order.characteristics.thermalSeam ?? '—'}
            />
          )}
          {order.characteristics.drilling !== undefined && (
            <Characteristic
              icon={<ToolOutlined />}
              label="Присадка"
              value={order.characteristics.drilling ?? '—'}
            />
          )}
        </div>
        <div className={styles.comment}>
          <CommentOutlined className={styles.commentIcon} />
          <div className={styles.commentLabel}>Комментарий</div>
          <div className={styles.fieldText}>
            <MarkdownPreview
              className={styles.fieldText}
              value={order.comment}
            />
          </div>
        </div>
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
  </>
);
