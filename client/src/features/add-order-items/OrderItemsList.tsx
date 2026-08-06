import { DeleteOutlined, HolderOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import {
  App,
  Button,
  Empty,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Table,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  useState,
  type CSSProperties,
  type DragEvent,
  type FC,
  type KeyboardEvent,
} from 'react';

import type { OrderItem } from '@entities/order';
import { useProductTemplates } from '@entities/product';

import { useOrderItems, type UpdateOrderItemDto } from './model/useOrderItems';

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
  editableCell: css`
    min-height: 24px;
    cursor: text;

    &:hover {
      background: var(--order-items-edit-bg);
    }
  `,
};

type EditableCellProps = {
  value?: string | number;
  kind: 'number' | 'text';
  min?: number;
  precision?: number;
  onSave: (value?: string | number) => Promise<void>;
};

const EditableCell: FC<EditableCellProps> = ({
  value,
  kind,
  min,
  precision,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = async () => {
    setIsEditing(false);
    if (draft !== value) await onSave(draft);
  };

  if (!isEditing) {
    return (
      <div
        className={styles.editableCell}
        onClick={() => {
          setDraft(value);
          setIsEditing(true);
        }}
      >
        {value === undefined || value === '' ? '—' : value}
      </div>
    );
  }

  const commonProps = {
    autoFocus: true,
    size: 'small' as const,
    variant: 'borderless' as const,
    onBlur: () => void save(),
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') event.currentTarget.blur();
      if (event.key === 'Escape') {
        setDraft(value);
        setIsEditing(false);
      }
    },
  };

  return kind === 'number' ? (
    <InputNumber
      {...commonProps}
      value={draft as number | undefined}
      min={min}
      precision={precision}
      onChange={(nextValue) => setDraft(nextValue ?? undefined)}
    />
  ) : (
    <Input
      {...commonProps}
      value={draft as string | undefined}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
};

type Props = { orderID: string };

type EditableTemplateCellProps = {
  value: string;
  label: string;
  options: { label: string; value: string }[];
  onSave: (value: string) => Promise<void>;
};

const EditableTemplateCell: FC<EditableTemplateCellProps> = ({
  value,
  label,
  options,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  if (!isEditing) {
    return (
      <div className={styles.editableCell} onClick={() => setIsEditing(true)}>
        {label}
      </div>
    );
  }

  return (
    <Select
      aria-label="Изменить номенклатуру"
      autoFocus
      open
      variant="borderless"
      value={value}
      options={options}
      showSearch
      optionFilterProp="label"
      onBlur={() => setIsEditing(false)}
      onChange={(templateId) => {
        setIsEditing(false);
        if (templateId !== value) void onSave(templateId);
      }}
    />
  );
};

export const OrderItemsList: FC<Props> = ({ orderID }) => {
  const { token } = theme.useToken();
  const [draggedItemID, setDraggedItemID] = useState<string>();
  const [dropTargetItemID, setDropTargetItemID] = useState<string>();
  const { notification } = App.useApp();
  const { data: productTemplates } = useProductTemplates();
  const { items, moveItem, moveItemTo, removeItem, updateItem, isMutating } =
    useOrderItems({ orderID });

  const templateOptions = (productTemplates?.products ?? []).map((product) => ({
    label: product.name,
    value: product.id,
  }));

  const handleUpdate = async (itemID: string, updates: UpdateOrderItemDto) => {
    try {
      await updateItem(itemID, updates);
    } catch {
      notification.error({ message: 'Не удалось изменить элемент заказа' });
    }
  };

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
    void handleMove(itemID, event.key === 'ArrowUp' ? -1 : 1);
  };

  const updateCharacteristics = (
    item: OrderItem,
    characteristics: Partial<OrderItem['characteristics']>,
  ) =>
    handleUpdate(item.id, {
      characteristics: { ...item.characteristics, ...characteristics },
    });

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
    { title: '№', width: 56, align: 'center', render: (_, __, i) => i + 1 },
    {
      title: 'Наименование',
      render: (_, item) => (
        <EditableTemplateCell
          value={item.template.id}
          label={item.snapshot?.name ?? item.template.name ?? '—'}
          options={templateOptions}
          onSave={(templateId) => handleUpdate(item.id, { templateId })}
        />
      ),
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
      render: (height: number | undefined, item) => (
        <EditableCell
          kind="number"
          min={0}
          value={height}
          onSave={(next) =>
            updateCharacteristics(item, { height: next as number | undefined })
          }
        />
      ),
    },
    {
      title: 'Ширина',
      dataIndex: ['characteristics', 'width'],
      width: 100,
      render: (width: number | undefined, item) => (
        <EditableCell
          kind="number"
          min={0}
          value={width}
          onSave={(next) =>
            updateCharacteristics(item, { width: next as number | undefined })
          }
        />
      ),
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      width: 120,
      render: (quantity: number, item) => (
        <EditableCell
          kind="number"
          min={1}
          precision={0}
          value={quantity}
          onSave={(next) => handleUpdate(item.id, { quantity: next as number })}
        />
      ),
    },
    {
      title: 'Комментарий',
      dataIndex: ['characteristics', 'comment'],
      render: (comment: string | undefined, item) => (
        <EditableCell
          kind="text"
          value={comment}
          onSave={(next) =>
            updateCharacteristics(item, {
              comment: String(next ?? '').trim() || undefined,
            })
          }
        />
      ),
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
          '--order-items-edit-bg': token.colorFillTertiary,
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
