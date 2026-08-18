import {
  DeleteOutlined,
  EditOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  createContext,
  use,
  useMemo,
  useState,
  type CSSProperties,
  type FC,
  type HTMLAttributes,
  type KeyboardEvent,
  type KeyboardEventHandler,
} from 'react';

import type { OrderItem } from '@entities/order';
import {
  CUSTOMER_PRICING_METHOD,
  useProductTemplates,
  type CustomerPricingMethod,
} from '@entities/product';

import { EditOrderItemModal } from './EditOrderItemModal';
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

type DragHandleContextValue = {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  setActivatorNodeRef: (element: HTMLElement | null) => void;
};

const DragHandleContext = createContext<DragHandleContextValue | null>(null);
const DragDisabledContext = createContext(false);

const SortableHandle: FC<{
  onKeyDown: KeyboardEventHandler<HTMLSpanElement>;
}> = ({ onKeyDown }) => {
  const dragHandle = use(DragHandleContext);

  return (
    <span
      ref={dragHandle?.setActivatorNodeRef}
      {...dragHandle?.attributes}
      {...dragHandle?.listeners}
      aria-label="Изменить позицию элемента"
      className={styles.dragHandle}
      role="button"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <HolderOutlined />
    </span>
  );
};

type SortableRowProps = HTMLAttributes<HTMLTableRowElement> & {
  'data-row-key': string;
};

const SortableRow: FC<SortableRowProps> = (props) => {
  const disabled = use(DragDisabledContext);
  const {
    attributes,
    isDragging,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: props['data-row-key'], disabled });
  const dragHandle = useMemo(
    () => ({ attributes, listeners, setActivatorNodeRef }),
    [attributes, listeners, setActivatorNodeRef],
  );

  return (
    <DragHandleContext value={dragHandle}>
      <tr
        {...props}
        ref={setNodeRef}
        style={{
          ...props.style,
          transform: CSS.Translate.toString(transform),
          transition,
          ...(isDragging ? { position: 'relative', zIndex: 1 } : {}),
        }}
      />
    </DragHandleContext>
  );
};

const sortableTableComponents = {
  body: { row: SortableRow },
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

const calculatedUnitLabels: Record<CustomerPricingMethod, string> = {
  [CUSTOMER_PRICING_METHOD.PER_ITEM]: 'ед.',
  [CUSTOMER_PRICING_METHOD.LINEAR_METER]: 'п/м',
  [CUSTOMER_PRICING_METHOD.AREA]: 'м.кв.',
  [CUSTOMER_PRICING_METHOD.VOLUME]: 'м.куб.',
};

const numberFormatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 3,
});

const currencyFormatter = new Intl.NumberFormat('ru-RU', {
  style: 'currency',
  currency: 'RUB',
  maximumFractionDigits: 2,
});

const getCalculatedUnits = (item: OrderItem): number => {
  const { width = 0, height = 0, thickness = 0 } = item.characteristics;
  const quantity = Number(item.quantity) || 0;

  switch (item.snapshot.customerPricingMethod) {
    case CUSTOMER_PRICING_METHOD.LINEAR_METER:
      return (Number(height) / 1000) * quantity;
    case CUSTOMER_PRICING_METHOD.AREA:
      return (Number(width) / 1000) * (Number(height) / 1000) * quantity;
    case CUSTOMER_PRICING_METHOD.VOLUME:
      return (
        (Number(width) / 1000) *
        (Number(height) / 1000) *
        (Number(thickness) / 1000) *
        quantity
      );
    case CUSTOMER_PRICING_METHOD.PER_ITEM:
    default:
      return quantity;
  }
};

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
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const [draggedItemID, setDraggedItemID] = useState<string>();
  const [dropTargetItemID, setDropTargetItemID] = useState<string>();
  const [editingItem, setEditingItem] = useState<OrderItem>();
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
      notification.error({ title: 'Не удалось изменить элемент заказа' });
    }
  };

  const handleModalUpdate = async (
    itemID: string,
    updates: UpdateOrderItemDto,
  ) => {
    try {
      await updateItem(itemID, updates);
      setEditingItem(undefined);
    } catch {
      notification.error({ title: 'Не удалось изменить элемент заказа' });
    }
  };

  const handleRemove = async (itemID: string) => {
    try {
      await removeItem(itemID);
    } catch {
      notification.error({ title: 'Не удалось удалить элемент заказа' });
    }
  };

  const handleMove = async (itemID: string, offset: -1 | 1) => {
    try {
      await moveItem(itemID, offset);
    } catch {
      notification.error({ title: 'Не удалось изменить порядок элементов' });
    }
  };

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    const itemID = String(active.id);
    const targetItemID = over ? String(over.id) : undefined;
    setDraggedItemID(undefined);
    setDropTargetItemID(undefined);
    if (!targetItemID || itemID === targetItemID) return;

    try {
      await moveItemTo(itemID, targetItemID);
    } catch {
      notification.error({ title: 'Не удалось изменить порядок элементов' });
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
        <SortableHandle
          onKeyDown={(event) => handleHandleKeyDown(event, item.id)}
        />
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
      title: 'Единицы',
      key: 'calculatedUnits',
      width: 120,
      align: 'right',
      render: (_, item) => {
        const pricingMethod = item.snapshot.customerPricingMethod;

        return `${numberFormatter.format(getCalculatedUnits(item))} ${calculatedUnitLabels[pricingMethod]}`;
      },
    },
    {
      title: 'Сумма',
      dataIndex: 'calculatedCustomerPrice',
      width: 140,
      align: 'right',
      render: (price: number) => currencyFormatter.format(Number(price) || 0),
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
      width: 76,
      render: (_, item) => (
        <div className={styles.actions}>
          <Button
            aria-label="Редактировать элемент"
            type="text"
            icon={<EditOutlined />}
            disabled={isMutating}
            size="small"
            onClick={() => setEditingItem(item)}
          />
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
      <DragDisabledContext value={isMutating}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => setDraggedItemID(String(active.id))}
          onDragOver={({ active, over }) =>
            setDropTargetItemID(
              over && over.id !== active.id ? String(over.id) : undefined,
            )
          }
          onDragCancel={() => {
            setDraggedItemID(undefined);
            setDropTargetItemID(undefined);
          }}
          onDragEnd={(event) => void handleDragEnd(event)}
        >
          <SortableContext
            items={items.map(({ id }) => id)}
            strategy={verticalListSortingStrategy}
          >
            <Table
              rowKey="id"
              components={sortableTableComponents}
              columns={columns}
              dataSource={items}
              onRow={(item) => ({
                className:
                  item.id === draggedItemID
                    ? styles.draggingRow
                    : item.id === dropTargetItemID
                      ? styles.dropTargetRow
                      : undefined,
              })}
              pagination={false}
              locale={{
                emptyText: <Empty description="Элементы ещё не добавлены" />,
              }}
              scroll={{ x: 900 }}
              size="small"
            />
          </SortableContext>
        </DndContext>
      </DragDisabledContext>
      <EditOrderItemModal
        item={editingItem}
        open={Boolean(editingItem)}
        templates={productTemplates?.products ?? []}
        loading={isMutating}
        onCancel={() => setEditingItem(undefined)}
        onSave={handleModalUpdate}
      />
    </div>
  );
};
