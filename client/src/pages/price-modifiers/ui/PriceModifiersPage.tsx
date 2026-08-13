import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import {
  Alert,
  Button,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
  type TableColumnsType,
} from 'antd';
import { useState, type FC } from 'react';

import {
  MODIFER_TYPE,
  usePriceModifiers,
  type PriceModifier,
} from '@entities/price-modifiers';
import { PriceModifierForm } from '@features/create-price-modifiers';
import { Editable } from '@shared/ui';

const pageStyles = css`
  padding: 24px;

  .ant-table-wrapper {
    margin-top: 16px;
  }
`;

type EditorState = PriceModifier | 'create' | null;

const typeNames: Record<PriceModifier['type'], string> = {
  [MODIFER_TYPE.PERCENTAGE]: 'Процент',
  [MODIFER_TYPE.FIXED_AMOUNT]: 'Фиксированная сумма',
};

const formatValue = (modifier: PriceModifier) =>
  modifier.type === MODIFER_TYPE.PERCENTAGE
    ? `${modifier.value}%`
    : new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 2,
      }).format(modifier.value);

export const PriceModifiersPage: FC = () => {
  const { data, error, isLoading, remove, update } = usePriceModifiers();
  const [editor, setEditor] = useState<EditorState>(null);
  const [messageApi, messageContext] = message.useMessage();
  const modifiers = data?.modifiers ?? [];

  const closeEditor = () => setEditor(null);

  const handleDelete = async (modifier: PriceModifier) => {
    try {
      await remove.trigger(modifier.id);
      messageApi.success('Модификатор удалён');
    } catch {
      messageApi.error('Не удалось удалить модификатор');
    }
  };

  const handleInlineSave = async (
    modifier: PriceModifier,
    field: 'name' | 'type' | 'value' | 'priority',
    value: string | undefined,
  ) => {
    if (value === undefined) return;

    const normalizedValue =
      field === 'value' || field === 'priority' ? Number(value) : value;
    try {
      await update.trigger(modifier.id, { [field]: normalizedValue });
      messageApi.success('Изменение сохранено');
    } catch {
      messageApi.error('Не удалось сохранить изменение');
    }
  };

  const columns: TableColumnsType<PriceModifier> = [
    {
      title: 'Название',
      dataIndex: 'name',
      render: (name: string, modifier) => (
        <Editable<string>
          name={`modifier-${modifier.id}-name`}
          defaultValue={name}
          control={<Input size="small" />}
          onSave={(_name, value) =>
            void handleInlineSave(modifier, 'name', value)
          }
        >
          {name}
        </Editable>
      ),
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      render: (type: PriceModifier['type'], modifier) => (
        <Editable<string>
          name={`modifier-${modifier.id}-type`}
          defaultValue={type}
          control={
            <Select
              size="small"
              options={Object.entries(typeNames).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          }
          onSave={(_name, value) =>
            void handleInlineSave(modifier, 'type', value)
          }
        >
          {typeNames[type]}
        </Editable>
      ),
    },
    {
      title: 'Значение',
      render: (_value, modifier) => (
        <Editable<string>
          name={`modifier-${modifier.id}-value`}
          defaultValue={String(modifier.value)}
          control={<Input size="small" type="number" />}
          onSave={(_name, value) =>
            void handleInlineSave(modifier, 'value', value)
          }
        >
          {formatValue(modifier)}
        </Editable>
      ),
    },
    {
      title: 'Приоритет',
      dataIndex: 'priority',
      align: 'right',
      render: (priority: number, modifier) => (
        <Editable<string>
          name={`modifier-${modifier.id}-priority`}
          defaultValue={String(priority)}
          control={<Input size="small" type="number" step={1} />}
          onSave={(_name, value) =>
            void handleInlineSave(modifier, 'priority', value)
          }
        >
          {priority}
        </Editable>
      ),
    },
    {
      title: 'Область действия',
      dataIndex: 'productTemplates',
      render: (templates: PriceModifier['productTemplates'] | undefined) =>
        (templates?.length ?? 0) === 0 ? (
          <Tag color="green">Глобальный</Tag>
        ) : (
          <Space size={[0, 4]} wrap>
            {(templates ?? []).map((template) => (
              <Tag key={template.id}>{template.name}</Tag>
            ))}
          </Space>
        ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_value, modifier) => (
        <Space>
          <Button
            aria-label={`Редактировать ${modifier.name}`}
            icon={<EditOutlined />}
            type="text"
            onClick={() => setEditor(modifier)}
          />
          <Popconfirm
            title="Удалить модификатор?"
            description={`Модификатор «${modifier.name}» будет удалён.`}
            okText="Удалить"
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(modifier)}
          >
            <Button
              aria-label={`Удалить ${modifier.name}`}
              icon={<DeleteOutlined />}
              type="text"
              danger
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <section className={pageStyles}>
      {messageContext}
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Ценовые модификаторы
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setEditor('create')}
        >
          Создать модификатор
        </Button>
      </Space>

      {error ? (
        <Alert
          type="error"
          message="Не удалось загрузить ценовые модификаторы"
          description="Обновите страницу или попробуйте позже."
          showIcon
        />
      ) : (
        <Table<PriceModifier>
          columns={columns}
          dataSource={modifiers}
          loading={isLoading}
          locale={{ emptyText: 'Модификаторов пока нет' }}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
          rowKey="id"
          scroll={{ x: 900 }}
          size="small"
        />
      )}

      <Modal
        title={editor === 'create' ? 'Новый модификатор' : 'Редактирование'}
        open={editor !== null}
        footer={null}
        width={900}
        centered
        styles={{
          content: {
            display: 'flex',
            maxHeight: 'calc(100dvh - 48px)',
            flexDirection: 'column',
            overflow: 'hidden',
          },
          body: {
            display: 'flex',
            flex: '1 1 auto',
            minHeight: 0,
            overflow: 'hidden',
          },
        }}
        onCancel={closeEditor}
      >
        {editor !== null && (
          <PriceModifierForm
            initialModifier={editor === 'create' ? undefined : editor}
            onSaved={closeEditor}
            onCancel={closeEditor}
          />
        )}
      </Modal>
    </section>
  );
};
