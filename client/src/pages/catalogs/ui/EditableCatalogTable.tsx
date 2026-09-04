import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
  type FormInstance,
  type TableColumnType,
  type TableColumnsType,
} from 'antd';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import type {
  CatalogEditor,
  CatalogField,
  CatalogRecord,
} from '../model/catalog';
import {
  buildCatalogInlineUpdate,
  getCatalogValue,
  setCatalogValue,
  toCatalogPath,
} from '../model/catalog-update';

const pageStyles = css`
  padding: 24px;

  .ant-table-wrapper {
    margin-top: 16px;
  }

  .editable-catalog-cell {
    min-height: 32px;
    margin: -8px;
    padding: 8px;
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: text;
  }

  .editable-catalog-cell:hover {
    border-color: var(--ant-color-border);
    background: var(--ant-color-fill-quaternary);
  }
`;

const cloneRecord = (record: CatalogRecord): Record<string, unknown> =>
  structuredClone(record) as Record<string, unknown>;

const formatValue = (value: unknown): ReactNode => {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
  return String(value);
};

type InlineEditorProps = {
  editor: Exclude<CatalogEditor, { kind: 'json' }>;
  value: unknown;
  onCancel: () => void;
  onSave: (value: unknown) => Promise<void>;
};

const InlineEditor = ({
  editor,
  value,
  onCancel,
  onSave,
}: InlineEditorProps) => {
  const [draft, setDraft] = useState(value);
  const savingRef = useRef(false);

  const save = async (nextValue = draft) => {
    if (savingRef.current) return;
    if (Object.is(nextValue, value)) {
      onCancel();
      return;
    }

    savingRef.current = true;
    try {
      await onSave(nextValue);
    } finally {
      savingRef.current = false;
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onCancel();
    }
  };

  if (editor.kind === 'select') {
    return (
      <Select
        autoFocus
        open
        size="small"
        style={{ width: '100%', minWidth: 140 }}
        value={draft as string | undefined}
        options={editor.options}
        onChange={(nextValue) => {
          setDraft(nextValue);
          void save(nextValue);
        }}
        onKeyDown={handleKeyDown}
        onClick={(event) => event.stopPropagation()}
      />
    );
  }

  if (editor.kind === 'number') {
    return (
      <InputNumber
        autoFocus
        size="small"
        style={{ width: '100%' }}
        value={typeof draft === 'number' ? draft : undefined}
        min={editor.min}
        precision={editor.precision}
        onChange={setDraft}
        onBlur={() => void save()}
        onPressEnter={() => void save()}
        onKeyDown={handleKeyDown}
        onClick={(event) => event.stopPropagation()}
      />
    );
  }

  return (
    <Input
      autoFocus
      size="small"
      value={typeof draft === 'string' ? draft : ''}
      placeholder={editor.placeholder}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => void save()}
      onPressEnter={() => void save()}
      onKeyDown={handleKeyDown}
      onClick={(event) => event.stopPropagation()}
    />
  );
};

type Props<T extends CatalogRecord> = {
  title: string;
  emptyText: string;
  items: T[];
  fields: CatalogField<T>[];
  loading: boolean;
  error?: unknown;
  headerAction?: ReactNode;
  onUpdate: (id: T['id'], updates: Record<string, unknown>) => Promise<unknown>;
  onDelete: (id: T['id']) => Promise<unknown>;
  editForm?: {
    render: (form: FormInstance, record: T) => ReactNode;
    getInitialValues: (record: T) => Record<string, unknown>;
    normalizeValues: (
      values: Record<string, unknown>,
    ) => Record<string, unknown>;
    onSaveError?: (error: unknown, form: FormInstance) => void;
  };
};

export const EditableCatalogTable = <T extends CatalogRecord>({
  title,
  emptyText,
  items,
  fields,
  loading,
  error,
  headerAction,
  onUpdate,
  onDelete,
  editForm,
}: Props<T>) => {
  const { message } = App.useApp();
  const [editingCell, setEditingCell] = useState<string>();
  const [editingRecord, setEditingRecord] = useState<T>();
  const [deletingId, setDeletingId] = useState<T['id']>();
  const [form] = Form.useForm();

  const formFields = useMemo(
    () => fields.filter((field) => field.form !== false && field.editor),
    [fields],
  );

  useEffect(() => {
    if (!editingRecord) return;

    const initialValues = editForm
      ? editForm.getInitialValues(editingRecord)
      : cloneRecord(editingRecord);
    if (!editForm) {
      formFields.forEach((field) => {
        if (field.editor?.kind !== 'json') return;
        const path = toCatalogPath(field.dataIndex);
        setCatalogValue(
          initialValues,
          path,
          JSON.stringify(getCatalogValue(editingRecord, path) ?? {}, null, 2),
        );
      });
    }
    form.setFieldsValue(initialValues);
  }, [editForm, editingRecord, form, formFields]);

  const saveInline = async (
    record: T,
    field: CatalogField<T>,
    value: unknown,
  ) => {
    try {
      await onUpdate(
        record.id,
        buildCatalogInlineUpdate(record, toCatalogPath(field.dataIndex), value),
      );
      setEditingCell(undefined);
      message.success('Изменение сохранено');
    } catch {
      message.error('Не удалось сохранить изменение');
    }
  };

  const handleFormFinish = async (values: Record<string, unknown>) => {
    if (!editingRecord) return;

    const updates = editForm
      ? editForm.normalizeValues(values)
      : structuredClone(values);
    try {
      if (!editForm) {
        formFields.forEach((field) => {
          if (field.editor?.kind !== 'json') return;
          const path = toCatalogPath(field.dataIndex);
          const rawValue = getCatalogValue(updates, path);
          setCatalogValue(
            updates,
            path,
            typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue,
          );
        });
      }
      await onUpdate(editingRecord.id, updates);
      setEditingRecord(undefined);
      message.success('Запись сохранена');
    } catch (saveError) {
      editForm?.onSaveError?.(saveError, form);
      if (saveError instanceof SyntaxError) {
        message.error('Проверьте формат JSON');
      } else {
        message.error('Не удалось сохранить запись');
      }
    }
  };

  const handleDelete = async (record: T) => {
    setDeletingId(record.id);
    try {
      await onDelete(record.id);
      if (editingRecord?.id === record.id) {
        setEditingRecord(undefined);
      }
      message.success('Запись удалена');
    } catch {
      message.error('Не удалось удалить запись');
    } finally {
      setDeletingId(undefined);
    }
  };

  const tableFields = fields.filter((field) => field.table !== false);
  const flexibleFieldIndex = tableFields.reduce(
    (lastIndex, field, index) =>
      field.width === undefined ? index : lastIndex,
    -1,
  );

  const columns: TableColumnsType<T> = [
    ...tableFields.map(
      (field, index): TableColumnType<T> => ({
        title: field.title,
        dataIndex:
          typeof field.dataIndex === 'string'
            ? field.dataIndex
            : [...field.dataIndex],
        width: field.width ?? (index === flexibleFieldIndex ? undefined : 180),
        ellipsis: field.ellipsis ?? true,
        align: field.align,
        render: (value: unknown, record: T) => {
          const path = toCatalogPath(field.dataIndex);
          const cellKey = `${record.id}:${path.join('.')}`;
          const editor = field.editor;
          const inlineEditor =
            field.inline !== false && editor && editor.kind !== 'json'
              ? editor
              : undefined;

          if (inlineEditor && editingCell === cellKey) {
            return (
              <InlineEditor
                editor={inlineEditor}
                value={value}
                onCancel={() => setEditingCell(undefined)}
                onSave={(nextValue) => saveInline(record, field, nextValue)}
              />
            );
          }

          const content = field.render
            ? field.render(value, record)
            : formatValue(value);

          return inlineEditor ? (
            <div
              className="editable-catalog-cell"
              title="Нажмите, чтобы изменить"
              onClick={() => setEditingCell(cellKey)}
            >
              {content}
            </div>
          ) : (
            content
          );
        },
      }),
    ),
    {
      title: 'Действия',
      key: 'actions',
      width: 112,
      render: (_value: unknown, record: T) => {
        const recordName = String(
          getCatalogValue(record, ['name']) ?? record.id,
        );

        return (
          <Space size={0}>
            <Button
              aria-label={`Открыть форму редактирования ${recordName}`}
              icon={<EditOutlined />}
              size="small"
              title="Расширенное редактирование"
              type="text"
              onClick={() => setEditingRecord(record)}
            />
            <Popconfirm
              title="Удалить запись?"
              description={`Запись «${recordName}» будет удалена безвозвратно.`}
              okText="Удалить"
              cancelText="Отмена"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record)}
            >
              <Button
                aria-label={`Удалить ${recordName}`}
                danger
                icon={<DeleteOutlined />}
                loading={deletingId === record.id}
                size="small"
                title="Удалить"
                type="text"
              />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <section className={pageStyles}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {title}
          </Typography.Title>
          <Typography.Text type="secondary">
            Нажмите на ячейку для быстрого редактирования
          </Typography.Text>
        </div>
        {headerAction}
      </Space>

      {error ? (
        <Alert
          type="error"
          title={`Не удалось загрузить справочник «${title}»`}
          description="Обновите страницу или попробуйте позже."
          showIcon
        />
      ) : (
        <Table<T>
          columns={columns}
          dataSource={items}
          loading={loading}
          locale={{ emptyText }}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          rowKey="id"
          size="small"
          tableLayout="fixed"
        />
      )}

      <Modal
        title={`Редактирование: ${String(
          editingRecord ? (getCatalogValue(editingRecord, ['name']) ?? '') : '',
        )}`}
        open={Boolean(editingRecord)}
        okText="Сохранить"
        cancelText="Отмена"
        confirmLoading={loading}
        destroyOnHidden
        width={720}
        centered
        styles={{
          container: {
            display: 'flex',
            maxHeight: 'calc(100dvh - 48px)',
            flexDirection: 'column',
            overflow: 'hidden',
          },
          body: {
            minHeight: 0,
            overflowX: 'hidden',
            overflowY: 'auto',
          },
        }}
        onCancel={() => setEditingRecord(undefined)}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          onFinish={handleFormFinish}
        >
          {editForm && editingRecord
            ? editForm.render(form, editingRecord)
            : formFields.map((field) => {
                const editor = field.editor;
                if (!editor) return null;
                const name = [...toCatalogPath(field.dataIndex)];
                const rules = [
                  ...(field.required
                    ? [{ required: true, message: 'Обязательное поле' }]
                    : []),
                  ...(field.rules ?? []),
                ];

                return (
                  <Form.Item
                    key={name.join('.')}
                    label={field.title}
                    name={name}
                    rules={rules}
                  >
                    {editor.kind === 'number' ? (
                      <InputNumber
                        style={{ width: '100%' }}
                        min={editor.min}
                        precision={editor.precision}
                      />
                    ) : editor.kind === 'select' ? (
                      <Select options={editor.options} />
                    ) : editor.kind === 'json' ? (
                      <Input.TextArea rows={editor.rows ?? 8} />
                    ) : (
                      <Input placeholder={editor.placeholder} />
                    )}
                  </Form.Item>
                );
              })}
        </Form>
      </Modal>
    </section>
  );
};
