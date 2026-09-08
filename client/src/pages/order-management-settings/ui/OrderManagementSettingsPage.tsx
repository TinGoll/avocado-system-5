import {
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { css } from '@emotion/css';
import {
  Alert,
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { FC } from 'react';
import { useState } from 'react';
import useSWR from 'swr';

import {
  archiveCustomStatus,
  createCustomStatus,
  deleteCustomStatus,
  getCustomStatuses,
  orderManagementKeys,
  updateCustomStatus,
  updateOrderManagementSettings,
  type CustomOrderStatus,
  type ManagementScope,
  type OrderManagementSettings,
} from '@shared/api';
import { fetcher } from '@shared/lib/swr';

const styles = {
  page: css`
    padding: 24px;
  `,
  heading: css`
    margin-top: 0 !important;
  `,
  card: css`
    margin-bottom: 16px;
  `,
  timeZoneForm: css`
    display: flex;
    align-items: flex-end;
    gap: 8px;

    .ant-form-item {
      margin-bottom: 0;
      min-width: 320px;
    }
  `,
};

type Editor = { scope: ManagementScope; status?: CustomOrderStatus } | null;
type StatusValues = { name: string; color: string; position?: number };

const StatusTable: FC<{
  scope: ManagementScope;
  onEdit: (status: CustomOrderStatus) => void;
}> = ({ scope, onEdit }) => {
  const { message } = App.useApp();
  const { data, error, isLoading, mutate } = useSWR(
    orderManagementKeys.statuses(scope),
    () => getCustomStatuses(scope),
  );
  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      await mutate();
      message.success(success);
    } catch {
      message.error('Операция не выполнена');
    }
  };

  if (error)
    return (
      <Alert
        showIcon
        type="error"
        title="Не удалось загрузить пользовательские статусы"
      />
    );
  return (
    <Table<CustomOrderStatus>
      dataSource={data?.items ?? []}
      loading={isLoading}
      locale={{ emptyText: 'Пользовательских статусов пока нет' }}
      pagination={false}
      rowKey="id"
      size="small"
      columns={[
        {
          title: 'Название',
          dataIndex: 'name',
          render: (name, status) => (
            <Space>
              <Tag color={status.color}>{name}</Tag>
              {status.archivedAt && <Tag>В архиве</Tag>}
            </Space>
          ),
        },
        { title: 'Позиция', dataIndex: 'position', width: 100 },
        {
          title: 'Действия',
          width: 150,
          render: (_, status) => (
            <Space>
              <Button
                aria-label={`Редактировать ${status.name}`}
                icon={<EditOutlined />}
                type="text"
                onClick={() => onEdit(status)}
              />
              {!status.archivedAt && (
                <Popconfirm
                  title="Архивировать статус?"
                  okText="Архивировать"
                  cancelText="Отмена"
                  onConfirm={() =>
                    run(
                      () => archiveCustomStatus(status.id),
                      'Статус архивирован',
                    )
                  }
                >
                  <Button
                    aria-label={`Архивировать ${status.name}`}
                    icon={<InboxOutlined />}
                    type="text"
                  />
                </Popconfirm>
              )}
              <Popconfirm
                title="Удалить неиспользованный статус?"
                okText="Удалить"
                cancelText="Отмена"
                onConfirm={() =>
                  run(() => deleteCustomStatus(status.id), 'Статус удалён')
                }
              >
                <Button
                  danger
                  aria-label={`Удалить ${status.name}`}
                  icon={<DeleteOutlined />}
                  type="text"
                />
              </Popconfirm>
            </Space>
          ),
        },
      ]}
    />
  );
};

export const OrderManagementSettingsPage: FC = () => {
  const { message } = App.useApp();
  const [editor, setEditor] = useState<Editor>(null);
  const [activeScope, setActiveScope] = useState<ManagementScope>('group');
  const [statusForm] = Form.useForm<StatusValues>();
  const [settingsForm] = Form.useForm<{ timeZone: string }>();
  const settings = useSWR<OrderManagementSettings>(
    orderManagementKeys.settings,
    (url: string) => fetcher<OrderManagementSettings>({ url }),
  );
  const statuses = useSWR(orderManagementKeys.statuses(activeScope), () =>
    getCustomStatuses(activeScope),
  );

  const openEditor = (scope: ManagementScope, status?: CustomOrderStatus) => {
    setEditor({ scope, status });
    statusForm.setFieldsValue(
      status
        ? { name: status.name, color: status.color, position: status.position }
        : { name: '', color: '#52c41a', position: undefined },
    );
  };
  const saveStatus = async (values: StatusValues) => {
    if (!editor) return;
    try {
      if (editor.status) await updateCustomStatus(editor.status.id, values);
      else await createCustomStatus({ scope: editor.scope, ...values });
      await statuses.mutate();
      setEditor(null);
      message.success('Статус сохранён');
    } catch {
      message.error('Не удалось сохранить статус');
    }
  };
  const saveTimeZone = async ({ timeZone }: { timeZone: string }) => {
    try {
      await updateOrderManagementSettings(timeZone.trim());
      await settings.mutate();
      message.success('Часовой пояс сохранён');
    } catch {
      message.error('Не удалось сохранить часовой пояс');
    }
  };

  return (
    <section className={styles.page}>
      <Typography.Title className={styles.heading} level={3}>
        Управление заказами
      </Typography.Title>
      <Card className={styles.card} title="Календарь">
        {settings.error ? (
          <Alert
            showIcon
            type="error"
            title="Не удалось загрузить часовой пояс"
          />
        ) : settings.isLoading ? (
          <Typography.Text>Загрузка…</Typography.Text>
        ) : (
          <Form
            className={styles.timeZoneForm}
            form={settingsForm}
            initialValues={{ timeZone: settings.data?.timeZone }}
            key={settings.data?.timeZone}
            onFinish={saveTimeZone}
          >
            <Form.Item
              label="Часовой пояс IANA"
              name="timeZone"
              rules={[{ required: true, message: 'Укажите часовой пояс' }]}
            >
              <Input placeholder="Europe/Moscow" />
            </Form.Item>
            <Button htmlType="submit" type="primary">
              Сохранить
            </Button>
          </Form>
        )}
      </Card>
      <Card
        title="Пользовательские статусы"
        extra={
          <Button
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => openEditor(activeScope)}
          >
            Добавить статус
          </Button>
        }
      >
        <Tabs
          activeKey={activeScope}
          onChange={(key) => setActiveScope(key as ManagementScope)}
          items={[
            {
              key: 'group',
              label: 'Заказы',
              children: (
                <StatusTable
                  scope="group"
                  onEdit={(status) => openEditor('group', status)}
                />
              ),
            },
            {
              key: 'document',
              label: 'Документы',
              children: (
                <StatusTable
                  scope="document"
                  onEdit={(status) => openEditor('document', status)}
                />
              ),
            },
          ]}
        />
      </Card>
      <Modal
        title={editor?.status ? 'Редактировать статус' : 'Новый статус'}
        open={Boolean(editor)}
        okText="Сохранить"
        cancelText="Отмена"
        onCancel={() => setEditor(null)}
        onOk={() => statusForm.submit()}
      >
        <Form form={statusForm} layout="vertical" onFinish={saveStatus}>
          <Form.Item
            label="Название"
            name="name"
            rules={[{ required: true, whitespace: true, max: 100 }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Цвет"
            name="color"
            rules={[
              {
                required: true,
                pattern: /^#[0-9a-fA-F]{6}$/,
                message: 'Формат цвета: #RRGGBB',
              },
            ]}
          >
            <Input type="color" />
          </Form.Item>
          <Form.Item label="Позиция" name="position">
            <InputNumber min={0} max={1000000} precision={0} />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
};
