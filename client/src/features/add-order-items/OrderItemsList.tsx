import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { css } from '@emotion/css';
import { App, Button, Empty, Popconfirm, Table, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { FC } from 'react';

import type { OrderItem } from '@entities/order';

import { useOrderItems } from './model/useOrderItems';

const styles = {
  container: css`
    border: 1px solid var(--app-devider-color);
    border-top: 0;

    & .ant-table-small .ant-table-thead > tr > th,
    & .ant-table-small .ant-table-tbody > tr > td {
      padding: 3px 6px;
      line-height: 20px;
    }
  `,
  actions: css`
    display: flex;
    justify-content: flex-end;
    gap: 2px;
  `,
};

type Props = {
  orderID: string;
};

export const OrderItemsList: FC<Props> = ({ orderID }) => {
  const { notification } = App.useApp();
  const { items, moveItem, removeItem, isMutating } = useOrderItems({
    orderID,
  });

  const handleRemove = async (itemID: string) => {
    try {
      await removeItem(itemID);
    } catch {
      notification.error({ message: 'Не удалось удалить элемент заказа' });
    }
  };

  const handleMove = async (itemID: string, offset: -1 | 1) => {
    try {
      await moveItem(itemID, offset);
    } catch {
      notification.error({ message: 'Не удалось изменить порядок элементов' });
    }
  };

  const columns: ColumnsType<OrderItem> = [
    {
      title: '№',
      width: 56,
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: 'Наименование',
      render: (_, item) => item.snapshot?.name ?? item.template?.name ?? '—',
    },
    {
      title: 'Группа',
      dataIndex: ['template', 'group'],
      render: (group?: string) => group || '—',
    },
    {
      title: 'Длина',
      dataIndex: ['characteristics', 'height'],
      width: 100,
      render: (height?: number) => height ?? '—',
    },
    {
      title: 'Ширина',
      dataIndex: ['characteristics', 'width'],
      width: 100,
      render: (width?: number) => width ?? '—',
    },
    { title: 'Количество', dataIndex: 'quantity', width: 120 },
    {
      title: 'Комментарий',
      dataIndex: ['characteristics', 'comment'],
      render: (comment?: string) => comment || '—',
    },
    {
      title: '',
      key: 'actions',
      width: 112,
      render: (_, item, index) => (
        <div className={styles.actions}>
          <Tooltip title="Переместить вверх">
            <Button
              aria-label="Переместить вверх"
              icon={<ArrowUpOutlined />}
              size="small"
              type="text"
              disabled={index === 0}
              loading={isMutating}
              onClick={() => handleMove(item.id, -1)}
            />
          </Tooltip>
          <Tooltip title="Переместить вниз">
            <Button
              aria-label="Переместить вниз"
              icon={<ArrowDownOutlined />}
              size="small"
              type="text"
              disabled={index === items.length - 1}
              loading={isMutating}
              onClick={() => handleMove(item.id, 1)}
            />
          </Tooltip>
          <Popconfirm
            title="Удалить элемент?"
            okText="Удалить"
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleRemove(item.id)}
          >
            <Tooltip title="Удалить">
              <Button
                aria-label="Удалить элемент"
                danger
                type="text"
                icon={<DeleteOutlined />}
                loading={isMutating}
                size="small"
              />
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={items}
        pagination={false}
        locale={{
          emptyText: <Empty description="Элементы ещё не добавлены" />,
        }}
        scroll={{ x: 900 }}
        size="small"
      />
    </div>
  );
};
