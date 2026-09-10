import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import useSWR from 'swr';

import {
  getCustomStatuses,
  getProductionBoards,
  type ManagementScope,
  type ProductionBoard,
} from '@shared/api';
import { backgroundFetcher } from '@shared/lib/swr';

import {
  createNotificationRule,
  getNotificationRules,
  notificationRuleKeys,
  previewNotificationRule,
  updateNotificationRule,
  type NotificationPreviewItem,
  type NotificationSchedulerState,
} from '../api/notification-rules';
import {
  allowedTemplateVariables,
  normalizeNotificationRule,
  unsupportedTemplateVariables,
  type NotificationRule,
  type NotificationRuleValues,
  type NotificationTrigger,
} from '../model/notification-rule';

const styles = {
  card: css`
    margin-top: 16px;
  `,
  mutedRow: css`
    opacity: 0.55;
  `,
  editorGrid: css`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 16px;

    @media (max-width: 720px) {
      grid-template-columns: 1fr;
    }
  `,
  fullWidth: css`
    grid-column: 1 / -1;
  `,
  preview: css`
    max-height: 240px;
    overflow: auto;
  `,
};

const triggerNames: Record<NotificationTrigger, string> = {
  due_soon: 'Срок приближается',
  overdue: 'Срок просрочен',
  stage_stalled: 'Задержка на этапе',
  stage_changed: 'Этап изменён',
  custom_status_changed: 'Пользовательский статус изменён',
  lifecycle_changed: 'Системный статус изменён',
};
const systemStatuses = [
  { value: 'draft', label: 'Черновик' },
  { value: 'in_production', label: 'В производстве' },
  { value: 'completed', label: 'Завершён' },
  { value: 'cancelled', label: 'Отменён' },
];
const initialValues: NotificationRuleValues = {
  name: '',
  enabled: false,
  scope: 'group',
  trigger: 'due_soon',
  conditions: { days: 2 },
  repeat: 'once',
  messageTemplate: '{{order.link}}: срок {{dueDate}}',
  severity: 'warning',
};

type Editor = NotificationRule | 'create' | null;

const MessagePreview: FC<{ item: NotificationPreviewItem }> = ({ item }) => {
  const navigate = useNavigate();
  return (
    <Typography.Text>
      {item.message.map((part) =>
        part.type === 'text' ? (
          <span key={`text:${part.text}`}>{part.text}</span>
        ) : (
          <Button
            key={`link:${part.target.type}:${part.label}`}
            size="small"
            type="link"
            onClick={() => navigate(`/order/${part.target.orderGroupId}`)}
          >
            {part.label}
          </Button>
        ),
      )}
    </Typography.Text>
  );
};

export const NotificationRulesCard: FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<NotificationRuleValues>();
  const [editor, setEditor] = useState<Editor>(null);
  const [preview, setPreview] = useState<NotificationPreviewItem[] | null>(
    null,
  );
  const [previewing, setPreviewing] = useState(false);
  const rules = useSWR(notificationRuleKeys.list, getNotificationRules);
  const scheduler = useSWR<NotificationSchedulerState>(
    notificationRuleKeys.scheduler,
    backgroundFetcher,
    { refreshInterval: 60_000 },
  );
  const scope = Form.useWatch('scope', form) ?? 'group';
  const trigger = Form.useWatch('trigger', form) ?? 'due_soon';
  const boards = useSWR('production-boards', getProductionBoards);
  const statuses = useSWR(`notification-rule-statuses:${scope}`, () =>
    getCustomStatuses(scope),
  );
  const [previewGroupId, setPreviewGroupId] = useState<number | null>(null);
  const [previewOrderId, setPreviewOrderId] = useState('');

  const boardOptions = (boards.data?.items ?? []).map((board) => ({
    value: board.id,
    label: board.name,
  }));
  const stageOptions = useMemo(
    () =>
      (boards.data?.items ?? []).flatMap((board: ProductionBoard) =>
        (board.stages ?? []).map((stage) => ({
          value: stage.id,
          label: `${board.name} / ${stage.name}`,
        })),
      ),
    [boards.data],
  );
  const statusOptions = (statuses.data?.items ?? []).map((status) => ({
    value: status.id,
    label: status.name,
  }));

  const openEditor = (value: NotificationRule | 'create') => {
    setEditor(value);
    setPreview(null);
    form.setFieldsValue(value === 'create' ? initialValues : value);
  };
  const valuesForRequest = async () =>
    normalizeNotificationRule(await form.validateFields());
  const save = async () => {
    try {
      const values = await valuesForRequest();
      if (editor === 'create') await createNotificationRule(values);
      else if (editor) await updateNotificationRule(editor, values);
      await rules.mutate();
      setEditor(null);
      message.success('Правило сохранено');
    } catch (error) {
      if (error && typeof error === 'object' && 'errorFields' in error) return;
      message.error('Не удалось сохранить правило');
    }
  };
  const toggle = async (rule: NotificationRule, enabled: boolean) => {
    try {
      await updateNotificationRule(rule, { ...rule, enabled });
      await rules.mutate();
      message.success(enabled ? 'Правило включено' : 'Правило выключено');
    } catch {
      message.error('Не удалось изменить правило');
    }
  };
  const runPreview = async () => {
    try {
      setPreviewing(true);
      const values = await valuesForRequest();
      const result = await previewNotificationRule({
        ...values,
        orderGroupId: previewGroupId ?? undefined,
        orderId:
          scope === 'document' && previewOrderId ? previewOrderId : undefined,
        limit: 20,
      });
      setPreview(result.items);
    } catch (error) {
      if (!(error && typeof error === 'object' && 'errorFields' in error))
        message.error('Не удалось построить предпросмотр');
    } finally {
      setPreviewing(false);
    }
  };
  const insertVariable = (variable: string) => {
    const current = form.getFieldValue('messageTemplate') ?? '';
    form.setFieldValue('messageTemplate', `${current}{{${variable}}}`);
    form.validateFields(['messageTemplate']).catch(() => undefined);
  };

  const temporal = ['due_soon', 'overdue', 'stage_stalled'].includes(trigger);
  const showStaticFilters = temporal;
  const showBoardFilters = scope === 'document' && temporal;
  const schedulerText = scheduler.data?.lastSucceededAt
    ? `Последний успешный запуск: ${new Date(scheduler.data.lastSucceededAt).toLocaleString('ru-RU')}`
    : scheduler.data?.running
      ? 'Scheduler выполняется впервые'
      : 'Успешных запусков пока нет';

  return (
    <Card
      className={styles.card}
      title="Правила уведомлений"
      extra={
        <Button
          icon={<PlusOutlined />}
          type="primary"
          onClick={() => openEditor('create')}
        >
          Создать правило
        </Button>
      }
    >
      {scheduler.error ? (
        <Alert showIcon type="error" title="Статус scheduler недоступен" />
      ) : scheduler.data?.lastError ? (
        <Alert
          showIcon
          type="error"
          title="Ошибка scheduler"
          description={scheduler.data.lastError}
        />
      ) : (
        <Alert
          showIcon
          type={scheduler.data?.enabled === false ? 'warning' : 'info'}
          title={
            scheduler.data?.enabled === false
              ? 'Scheduler выключен'
              : schedulerText
          }
        />
      )}
      <Table<NotificationRule>
        dataSource={rules.data?.items ?? []}
        loading={rules.isLoading}
        locale={{ emptyText: 'Правил пока нет' }}
        pagination={false}
        rowClassName={(rule) => (rule.enabled ? '' : styles.mutedRow)}
        rowKey="id"
        size="small"
        columns={[
          { title: 'Название', dataIndex: 'name' },
          {
            title: 'Событие',
            dataIndex: 'trigger',
            render: (value: NotificationTrigger) => triggerNames[value],
          },
          {
            title: 'Объект',
            dataIndex: 'scope',
            render: (value: ManagementScope) =>
              value === 'group' ? 'Заказ' : 'Документ',
          },
          {
            title: 'Статус',
            render: (_, rule) => (
              <Switch
                checked={rule.enabled}
                checkedChildren="Вкл."
                unCheckedChildren="Выкл."
                onChange={(checked) => void toggle(rule, checked)}
              />
            ),
          },
          {
            title: 'Revision',
            dataIndex: 'revision',
            width: 90,
          },
          {
            title: '',
            width: 56,
            render: (_, rule) => (
              <Button
                aria-label={`Редактировать ${rule.name}`}
                icon={<EditOutlined />}
                type="text"
                onClick={() => openEditor(rule)}
              />
            ),
          },
        ]}
      />
      <Modal
        title={editor === 'create' ? 'Новое правило' : 'Редактировать правило'}
        open={editor !== null}
        okText="Сохранить"
        cancelText="Отмена"
        width={880}
        onCancel={() => setEditor(null)}
        onOk={() => void save()}
      >
        {editor && editor !== 'create' && (
          <Alert
            showIcon
            type="warning"
            title={`Будет создана revision ${editor.revision + 1}`}
            description="Изменение правила может повторно уведомить уже подходящие заказы и документы."
          />
        )}
        <Form
          className={styles.editorGrid}
          form={form}
          layout="vertical"
          initialValues={initialValues}
        >
          <Form.Item
            label="Название"
            name="name"
            rules={[{ required: true, whitespace: true, max: 100 }]}
          >
            <Input placeholder="За 2 дня" />
          </Form.Item>
          <Form.Item label="Активность" name="enabled" valuePropName="checked">
            <Checkbox>Включить правило</Checkbox>
          </Form.Item>
          <Form.Item label="Объект" name="scope" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'group', label: 'Заказ' },
                { value: 'document', label: 'Документ' },
              ]}
              onChange={(value) => {
                if (
                  value === 'group' &&
                  ['stage_stalled'].includes(form.getFieldValue('trigger'))
                )
                  form.setFieldValue('trigger', 'due_soon');
                setPreview(null);
              }}
            />
          </Form.Item>
          <Form.Item
            label="Событие"
            name="trigger"
            rules={[{ required: true }]}
          >
            <Select
              options={Object.entries(triggerNames)
                .filter(
                  ([value]) =>
                    !(scope === 'group' && value === 'stage_stalled') &&
                    !(scope === 'document' && value === 'lifecycle_changed'),
                )
                .map(([value, label]) => ({ value, label }))}
              onChange={(value: NotificationTrigger) => {
                if (!['due_soon', 'overdue', 'stage_stalled'].includes(value))
                  form.setFieldValue('repeat', 'once');
                setPreview(null);
              }}
            />
          </Form.Item>
          {(trigger === 'due_soon' || trigger === 'stage_stalled') && (
            <Form.Item
              label="Количество дней"
              name={['conditions', 'days']}
              rules={[{ required: true }]}
            >
              <InputNumber min={0} max={3650} precision={0} />
            </Form.Item>
          )}
          <Form.Item label="Повторение" name="repeat">
            <Select
              disabled={!temporal}
              options={[
                { value: 'once', label: 'Один раз' },
                { value: 'daily', label: 'Каждый день' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Важность" name="severity">
            <Select
              options={[
                { value: 'info', label: 'Информация' },
                { value: 'warning', label: 'Предупреждение' },
                { value: 'error', label: 'Ошибка' },
              ]}
            />
          </Form.Item>
          {showStaticFilters && (
            <>
              <Form.Item
                label="Системные статусы"
                name={['conditions', 'systemStatusIn']}
              >
                <Select mode="multiple" allowClear options={systemStatuses} />
              </Form.Item>
              <Form.Item
                label="Пользовательские статусы"
                name={['conditions', 'customStatusIn']}
              >
                <Select mode="multiple" allowClear options={statusOptions} />
              </Form.Item>
              <Form.Item
                label="Кроме статусов"
                name={['conditions', 'customStatusNotIn']}
              >
                <Select mode="multiple" allowClear options={statusOptions} />
              </Form.Item>
            </>
          )}
          {(showBoardFilters || trigger === 'stage_changed') && (
            <Form.Item
              label="Производственные доски"
              name={['conditions', 'boardIn']}
            >
              <Select mode="multiple" allowClear options={boardOptions} />
            </Form.Item>
          )}
          {showBoardFilters && (
            <Form.Item label="Этапы" name={['conditions', 'stageIn']}>
              <Select mode="multiple" allowClear options={stageOptions} />
            </Form.Item>
          )}
          {trigger === 'stage_changed' && (
            <>
              <Form.Item label="Из этапов" name={['conditions', 'fromStageIn']}>
                <Select mode="multiple" allowClear options={stageOptions} />
              </Form.Item>
              <Form.Item label="В этапы" name={['conditions', 'toStageIn']}>
                <Select mode="multiple" allowClear options={stageOptions} />
              </Form.Item>
            </>
          )}
          {trigger === 'custom_status_changed' && (
            <>
              <Form.Item
                label="Из статусов"
                name={['conditions', 'fromCustomStatusIn']}
              >
                <Select mode="multiple" allowClear options={statusOptions} />
              </Form.Item>
              <Form.Item
                label="В статусы"
                name={['conditions', 'toCustomStatusIn']}
              >
                <Select mode="multiple" allowClear options={statusOptions} />
              </Form.Item>
            </>
          )}
          {trigger === 'lifecycle_changed' && (
            <>
              <Form.Item
                label="Из системных статусов"
                name={['conditions', 'fromSystemStatusIn']}
              >
                <Select mode="multiple" allowClear options={systemStatuses} />
              </Form.Item>
              <Form.Item
                label="В системные статусы"
                name={['conditions', 'toSystemStatusIn']}
              >
                <Select mode="multiple" allowClear options={systemStatuses} />
              </Form.Item>
            </>
          )}
          <Form.Item
            className={styles.fullWidth}
            label="Текст уведомления"
            name="messageTemplate"
            rules={[
              { required: true, whitespace: true, max: 2000 },
              {
                validator: (_, value: string) => {
                  const invalid = unsupportedTemplateVariables(
                    value ?? '',
                    scope,
                  );
                  return invalid.length
                    ? Promise.reject(
                        new Error(
                          `Недоступные переменные: ${invalid.join(', ')}`,
                        ),
                      )
                    : Promise.resolve();
                },
              },
            ]}
          >
            <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} />
          </Form.Item>
          <div className={styles.fullWidth}>
            <Typography.Text type="secondary">
              Вставить переменную:{' '}
            </Typography.Text>
            <Space size={[4, 4]} wrap>
              {allowedTemplateVariables(scope).map((variable) => (
                <Tag
                  key={variable}
                  onClick={() => insertVariable(variable)}
                >{`{{${variable}}}`}</Tag>
              ))}
            </Space>
          </div>
          <Divider className={styles.fullWidth}>
            Предпросмотр без отправки
          </Divider>
          <Form.Item label="ID заказа для preview">
            <InputNumber
              min={1}
              precision={0}
              value={previewGroupId}
              onChange={setPreviewGroupId}
            />
          </Form.Item>
          {scope === 'document' && (
            <Form.Item label="UUID документа для preview">
              <Input
                value={previewOrderId}
                onChange={(event) => setPreviewOrderId(event.target.value)}
              />
            </Form.Item>
          )}
          <div className={styles.fullWidth}>
            <Button loading={previewing} onClick={() => void runPreview()}>
              Показать совпадения
            </Button>
          </div>
          {preview !== null && (
            <div className={`${styles.fullWidth} ${styles.preview}`}>
              {preview.length === 0 ? (
                <Alert type="info" title="Совпадений нет" />
              ) : (
                <Space direction="vertical">
                  {preview.map((item) => (
                    <Card key={JSON.stringify(item.target)} size="small">
                      <Space direction="vertical">
                        <Tag>
                          {item.target.type === 'order'
                            ? `Заказ ${item.target.orderGroupId}`
                            : `Документ заказа ${item.target.orderGroupId}`}
                        </Tag>
                        <MessagePreview item={item} />
                        {item.possibleRepeat && (
                          <Typography.Text type="warning">
                            Возможно ежедневное повторение
                          </Typography.Text>
                        )}
                      </Space>
                    </Card>
                  ))}
                </Space>
              )}
            </div>
          )}
        </Form>
      </Modal>
    </Card>
  );
};
