import {
  DeleteOutlined,
  EditOutlined,
  InboxOutlined,
  MinusCircleOutlined,
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
  Select,
  Space,
  Switch,
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
  getProductionBoards,
  orderManagementKeys,
  updateCustomStatus,
  updateOrderManagementSettings,
  type CustomOrderStatus,
  type DueDateRule,
  type ManagementScope,
  type OrderManagementSettings,
  type OrderLifecycleStatus,
} from '@shared/api';
import { fetcher } from '@shared/lib/swr';

import { NotificationRulesCard } from './NotificationRulesCard';

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
  autoAddForm: css`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
    align-items: end;
    gap: 8px;

    .ant-form-item {
      margin-bottom: 0;
    }

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  `,
  dueDateRules: css`
    display: grid;
    gap: 12px;
  `,
  dueDateRule: css`
    display: grid;
    grid-template-columns: minmax(180px, 1fr) minmax(220px, 1fr) 180px auto;
    align-items: end;
    gap: 8px;

    .ant-form-item {
      margin-bottom: 0;
    }

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  `,
};

type Editor = { scope: ManagementScope; status?: CustomOrderStatus } | null;
type StatusValues = { name: string; color: string; position?: number };
type AutoAddValues = {
  enabled: boolean;
  autoAddStatus?: OrderLifecycleStatus;
  autoAddBoardId?: string;
  autoAddStageId?: string;
};
type DueDateRuleValues = { dueDateRules: DueDateRule[] };

const lifecycleOptions = [
  { value: 'in_production', label: 'В производстве' },
  { value: 'completed', label: 'Завершён' },
  { value: 'cancelled', label: 'Отменён' },
];

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
  const [autoAddForm] = Form.useForm<AutoAddValues>();
  const [dueDateRulesForm] = Form.useForm<DueDateRuleValues>();
  const settings = useSWR<OrderManagementSettings>(
    orderManagementKeys.settings,
    (url: string) => fetcher<OrderManagementSettings>({ url }),
  );
  const statuses = useSWR(orderManagementKeys.statuses(activeScope), () =>
    getCustomStatuses(activeScope),
  );
  const boards = useSWR('production-boards', getProductionBoards);
  const groupStatuses = useSWR(orderManagementKeys.statuses('group'), () =>
    getCustomStatuses('group'),
  );
  const autoAddEnabled = Form.useWatch('enabled', autoAddForm) ?? false;
  const selectedBoardId = Form.useWatch('autoAddBoardId', autoAddForm);
  const activeBoards = (boards.data?.items ?? []).filter(
    (board) => !board.archivedAt,
  );
  const stageOptions =
    activeBoards
      .find((board) => board.id === selectedBoardId)
      ?.stages?.filter((stage) => !stage.archivedAt)
      .map((stage) => ({ value: stage.id, label: stage.name })) ?? [];

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
      await updateOrderManagementSettings({
        timeZone: timeZone.trim(),
        autoAddStatus: settings.data?.autoAddStatus ?? null,
        autoAddBoardId: settings.data?.autoAddBoardId ?? null,
        autoAddStageId: settings.data?.autoAddStageId ?? null,
        dueDateRules: settings.data?.dueDateRules ?? [],
      });
      await settings.mutate();
      message.success('Часовой пояс сохранён');
    } catch {
      message.error('Не удалось сохранить часовой пояс');
    }
  };
  const saveAutoAdd = async (values: AutoAddValues) => {
    if (!settings.data) return;
    try {
      await updateOrderManagementSettings({
        timeZone: settings.data.timeZone,
        autoAddStatus: values.enabled ? (values.autoAddStatus ?? null) : null,
        autoAddBoardId: values.enabled ? (values.autoAddBoardId ?? null) : null,
        autoAddStageId: values.enabled ? (values.autoAddStageId ?? null) : null,
        dueDateRules: settings.data.dueDateRules,
      });
      await settings.mutate();
      message.success('Автодобавление сохранено');
    } catch {
      message.error('Не удалось сохранить автодобавление');
    }
  };
  const saveDueDateRules = async ({ dueDateRules }: DueDateRuleValues) => {
    if (!settings.data) return;
    try {
      await updateOrderManagementSettings({
        timeZone: settings.data.timeZone,
        autoAddStatus: settings.data.autoAddStatus,
        autoAddBoardId: settings.data.autoAddBoardId,
        autoAddStageId: settings.data.autoAddStageId,
        dueDateRules,
      });
      await settings.mutate();
      message.success('Правила срока сохранены');
    } catch {
      message.error('Не удалось сохранить правила срока');
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
      <Card className={styles.card} title="Автоматический срок сдачи">
        {settings.error || groupStatuses.error ? (
          <Alert showIcon type="error" title="Не удалось загрузить настройки" />
        ) : settings.isLoading || groupStatuses.isLoading ? (
          <Typography.Text>Загрузка…</Typography.Text>
        ) : (
          <Form
            form={dueDateRulesForm}
            key={JSON.stringify(settings.data?.dueDateRules)}
            initialValues={{ dueDateRules: settings.data?.dueDateRules ?? [] }}
            onFinish={saveDueDateRules}
          >
            <Form.List name="dueDateRules">
              {(fields, { add, remove }) => (
                <div className={styles.dueDateRules}>
                  {fields.map((field) => (
                    <div className={styles.dueDateRule} key={field.key}>
                      <Form.Item
                        {...field}
                        label="При переходе в статус"
                        name={[field.name, 'status']}
                        rules={[{ required: true, message: 'Выберите статус' }]}
                      >
                        <Select options={lifecycleOptions} />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        label="Пользовательский статус"
                        name={[field.name, 'customStatusId']}
                      >
                        <Select
                          allowClear
                          placeholder="Любой"
                          options={(groupStatuses.data?.items ?? [])
                            .filter((status) => !status.archivedAt)
                            .map((status) => ({
                              value: status.id,
                              label: status.name,
                            }))}
                        />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        label="Рабочих дней"
                        name={[field.name, 'workingDays']}
                        rules={[{ required: true, message: 'Укажите срок' }]}
                      >
                        <InputNumber min={0} max={1000} precision={0} />
                      </Form.Item>
                      <Button
                        danger
                        aria-label="Удалить правило"
                        icon={<MinusCircleOutlined />}
                        type="text"
                        onClick={() => remove(field.name)}
                      />
                    </div>
                  ))}
                  <Space>
                    <Button
                      icon={<PlusOutlined />}
                      onClick={() =>
                        add({
                          status: 'in_production',
                          customStatusId: null,
                          workingDays: 20,
                        })
                      }
                    >
                      Добавить правило
                    </Button>
                    <Button htmlType="submit" type="primary">
                      Сохранить
                    </Button>
                  </Space>
                </div>
              )}
            </Form.List>
          </Form>
        )}
      </Card>
      <Card className={styles.card} title="Автодобавление на доску">
        {settings.error || boards.error ? (
          <Alert showIcon type="error" title="Не удалось загрузить настройки" />
        ) : settings.isLoading || boards.isLoading ? (
          <Typography.Text>Загрузка…</Typography.Text>
        ) : (
          <Form
            className={styles.autoAddForm}
            form={autoAddForm}
            key={`${settings.data?.autoAddStatus}:${settings.data?.autoAddBoardId}:${settings.data?.autoAddStageId}`}
            initialValues={{
              enabled: Boolean(settings.data?.autoAddStatus),
              autoAddStatus: settings.data?.autoAddStatus ?? undefined,
              autoAddBoardId: settings.data?.autoAddBoardId ?? undefined,
              autoAddStageId: settings.data?.autoAddStageId ?? undefined,
            }}
            onFinish={saveAutoAdd}
          >
            <Form.Item label="Включено" name="enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item
              label="При переходе в статус"
              name="autoAddStatus"
              rules={[{ required: autoAddEnabled, message: 'Выберите статус' }]}
            >
              <Select disabled={!autoAddEnabled} options={lifecycleOptions} />
            </Form.Item>
            <Form.Item
              label="Доска"
              name="autoAddBoardId"
              rules={[{ required: autoAddEnabled, message: 'Выберите доску' }]}
            >
              <Select
                disabled={!autoAddEnabled}
                options={activeBoards.map((board) => ({
                  value: board.id,
                  label: board.name,
                }))}
                onChange={() =>
                  autoAddForm.setFieldValue('autoAddStageId', undefined)
                }
              />
            </Form.Item>
            <Form.Item
              label="Этап"
              name="autoAddStageId"
              rules={[{ required: autoAddEnabled, message: 'Выберите этап' }]}
            >
              <Select
                disabled={!autoAddEnabled || !selectedBoardId}
                options={stageOptions}
              />
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
      <NotificationRulesCard />
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
