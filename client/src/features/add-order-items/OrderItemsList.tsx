import { DeleteOutlined, HolderOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import { App, Button, Empty, Popconfirm, Table, theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  useState,
  type CSSProperties,
  type DragEvent,
  type FC,
  type KeyboardEvent,
} from 'react';

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
  dragHandle: css`
    display: inline-flex;
    padding: 2px 4px;
    color: var(--order-items-drag-color);
    cursor: grab;
    font-size: 16px;
    opacity: 0.8;
    touch-action: none;

    &:hover,
    &:focus-visible {
      opacity: 1;
    }

    &:active {
      cursor: grabbing;
    }
  `,
  draggingRow: css`
    opacity: 0.65;

    & > td {
      background: var(--order-items-bg) !important;
    }
  `,
  dropTargetRow: css`
    & > td {
      background: var(--order-items-drop-bg) !important;
    }
  `,
};

type Props = {
  orderID: string;
};

export const OrderItemsList: FC<Props> = ({ orderID }) => {
  const { token } = theme.useToken();
  const [draggedItemID, setDraggedItemID] = useState<string>();
  const [dropTargetItemID, setDropTargetItemID] = useState<string>();
  const { notification } = App.useApp();
  const { items, moveItem, moveItemTo, removeItem, isMutating } = useOrderItems(
    {
      orderID,
    },
  );

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

  const handleDragStart = (event: DragEvent, itemID: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', itemID);
    setDraggedItemID(itemID);
  };

  const handleDrop = async (targetItemID: string) => {
    const itemID = draggedItemID;
    setDraggedItemID(undefined);
    setDropTargetItemID(undefined);
    if (!itemID || itemID === targetItemID) return;

    try {
      await moveItemTo(itemID, targetItemID);
    } catch {
      notification.error({ message: 'Не удалось изменить порядок элементов' });
    }
  };

  const handleHandleKeyDown = (event: KeyboardEvent, itemID: string) => {
    if (isMutating || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) {
      return;
    }
    event.preventDefault();
    void handleMove(itemID, event.key === 'ArrowUp' ? -1 : 1).catch(() => {
      notification.error({ message: 'Не удалось изменить порядок элементов' });
    });
  };

  const columns: ColumnsType<OrderItem> = [
    {
      title: '',
      key: 'dragHandle',
      width: 36,
      align: 'center',
      render: (_, item) => (
        <span
          aria-label="Изменить позицию элемента"
          className={styles.dragHandle}
          draggable={!isMutating}
          role="button"
          tabIndex={0}
          onDragEnd={() => {
            setDraggedItemID(undefined);
            setDropTargetItemID(undefined);
          }}
          onDragStart={(event) => handleDragStart(event, item.id)}
          onKeyDown={(event) => handleHandleKeyDown(event, item.id)}
        >
          <HolderOutlined />
        </span>
      ),
    },
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
      width: 48,
      render: (_, item) => (
        <div className={styles.actions}>
          <Popconfirm
            title="Удалить элемент?"
            okText="Удалить"
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleRemove(item.id)}
          >
            <Button
              aria-label="Удалить элемент"
              danger
              type="text"
              icon={<DeleteOutlined />}
              loading={isMutating}
              size="small"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div
      className={styles.container}
      style={
        {
          '--order-items-bg': token.colorBgContainer,
          '--order-items-drag-color': token.colorTextSecondary,
          '--order-items-drop-bg': token.colorPrimaryBg,
        } as CSSProperties
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={items}
        onRow={(item) => ({
          className:
            item.id === draggedItemID
              ? styles.draggingRow
              : item.id === dropTargetItemID
                ? styles.dropTargetRow
                : undefined,
          onDragOver: (event) => {
            if (!draggedItemID || draggedItemID === item.id) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            setDropTargetItemID(item.id);
          },
          onDrop: (event) => {
            event.preventDefault();
            void handleDrop(item.id);
          },
        })}
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
