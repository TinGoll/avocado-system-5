import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  InboxOutlined,
  PlusOutlined,
} from '@ant-design/icons';
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
} from 'antd';
import { type FC, useEffect, useState } from 'react';

import {
  addProductionStage,
  archiveProductionBoard,
  archiveProductionStage,
  createProductionBoard,
  deleteProductionStage,
  reorderProductionStages,
  updateProductionBoard,
  updateProductionStage,
  type ProductionBoard,
  type ProductionStage,
  type StageDefinition,
} from '@shared/api';

const kindOptions = [
  { value: 'queue', label: 'Очередь (0%)' },
  { value: 'active', label: 'Работа (1–99%)' },
  { value: 'done', label: 'Готово (100%)' },
];
const defaults: StageDefinition[] = [
  { name: 'Очередь', color: '#8c8c8c', kind: 'queue', progressPercent: 0 },
  { name: 'В работе', color: '#1677ff', kind: 'active', progressPercent: 50 },
  { name: 'Готово', color: '#52c41a', kind: 'done', progressPercent: 100 },
];

type Props = {
  open: boolean;
  board?: ProductionBoard;
  onClose: () => void;
  onSaved: (board: ProductionBoard) => void;
};
type BoardValues = {
  name: string;
  description?: string;
  stages: StageDefinition[];
  initialStageIndex: number;
};

const StageMeaningEditor: FC<{
  stage: ProductionStage;
  disabled: boolean;
  onSave: (values: Pick<StageDefinition, 'kind' | 'progressPercent'>) => void;
}> = ({ stage, disabled, onSave }) => {
  const [kind, setKind] = useState(stage.kind);
  const [progressPercent, setProgressPercent] = useState(stage.progressPercent);
  const changeKind = (next: ProductionStage['kind']) => {
    setKind(next);
    setProgressPercent(next === 'queue' ? 0 : next === 'done' ? 100 : 50);
  };

  return (
    <Space>
      <Select
        disabled={disabled}
        value={kind}
        options={kindOptions}
        onChange={changeKind}
      />
      <InputNumber
        disabled={disabled || kind !== 'active'}
        min={1}
        max={99}
        precision={0}
        value={progressPercent}
        onChange={(value) => setProgressPercent(value ?? 50)}
      />
      {!disabled && (
        <Button onClick={() => onSave({ kind, progressPercent })}>
          Применить
        </Button>
      )}
    </Space>
  );
};

const AddStageForm: FC<{
  loading: boolean;
  onAdd: (values: StageDefinition) => void;
}> = ({ loading, onAdd }) => {
  const [form] = Form.useForm<StageDefinition>();
  const kind = Form.useWatch('kind', form);
  return (
    <Form<StageDefinition>
      form={form}
      layout="inline"
      initialValues={{
        color: '#1677ff',
        kind: 'active',
        progressPercent: 50,
      }}
      onFinish={onAdd}
    >
      <Form.Item name="name" rules={[{ required: true }]}>
        <Input placeholder="Новая колонка" />
      </Form.Item>
      <Form.Item name="color">
        <Input type="color" />
      </Form.Item>
      <Form.Item name="kind">
        <Select
          options={kindOptions}
          onChange={(kind: ProductionStage['kind']) =>
            form.setFieldValue(
              'progressPercent',
              kind === 'queue' ? 0 : kind === 'done' ? 100 : 50,
            )
          }
        />
      </Form.Item>
      <Form.Item name="progressPercent">
        <InputNumber disabled={kind !== 'active'} min={1} max={99} />
      </Form.Item>
      <Button htmlType="submit" icon={<PlusOutlined />} loading={loading}>
        Добавить
      </Button>
    </Form>
  );
};

export const ProductionBoardEditor: FC<Props> = ({
  open,
  board,
  onClose,
  onSaved,
}) => {
  const { message } = App.useApp();
  const [form] = Form.useForm<BoardValues>();
  const [saving, setSaving] = useState(false);
  const stages = board?.stages?.filter(({ archivedAt }) => !archivedAt) ?? [];

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(
      board
        ? { name: board.name, description: board.description ?? undefined }
        : { name: '', description: '', stages: defaults, initialStageIndex: 0 },
    );
  }, [board, form, open]);

  const run = async (
    action: () => Promise<ProductionBoard>,
    success: string,
  ) => {
    setSaving(true);
    try {
      const result = await action();
      onSaved(result);
      message.success(success);
    } catch {
      message.error('Не удалось сохранить настройки доски');
    } finally {
      setSaving(false);
    }
  };

  const save = (values: BoardValues) =>
    board
      ? run(
          () =>
            updateProductionBoard(board.id, {
              expectedVersion: board.version,
              name: values.name,
              description: values.description?.trim() || null,
            }),
          'Доска сохранена',
        )
      : run(
          () =>
            createProductionBoard({
              ...values,
              initialStageIndex: values.initialStageIndex ?? 0,
            }),
          'Доска создана',
        );

  const replacementFor = (stage: ProductionStage) =>
    stage.id === board?.initialStageId
      ? stages.find(({ kind, id }) => kind === 'queue' && id !== stage.id)?.id
      : undefined;

  const moveStage = (stage: ProductionStage, offset: -1 | 1) => {
    if (!board) return;
    const ids = stages.map(({ id }) => id);
    const from = ids.indexOf(stage.id);
    const to = from + offset;
    if (to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    void run(
      () => reorderProductionStages(board.id, board.version, ids),
      'Порядок колонок сохранён',
    );
  };

  return (
    <Modal
      width={900}
      open={open}
      title={board ? 'Настройка доски' : 'Новая производственная доска'}
      okText="Сохранить"
      cancelText="Закрыть"
      confirmLoading={saving}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      {board?.archivedAt && (
        <Alert showIcon type="warning" title="Доска находится в архиве" />
      )}
      <Form<BoardValues> form={form} layout="vertical" onFinish={save}>
        <Form.Item
          label="Название"
          name="name"
          rules={[{ required: true, whitespace: true, max: 100 }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="Описание" name="description" rules={[{ max: 2000 }]}>
          <Input.TextArea rows={2} />
        </Form.Item>
        {!board && (
          <Form.Item hidden name="initialStageIndex">
            <InputNumber />
          </Form.Item>
        )}
        {!board && (
          <Form.List name="stages">
            {(fields) => (
              <>
                {fields.map((field, index) => (
                  <Space key={field.key} align="baseline" wrap>
                    <Form.Item
                      name={[field.name, 'name']}
                      rules={[{ required: true }]}
                    >
                      <Input placeholder="Колонка" />
                    </Form.Item>
                    <Form.Item name={[field.name, 'color']}>
                      <Input type="color" />
                    </Form.Item>
                    <Form.Item name={[field.name, 'kind']}>
                      <Select
                        options={kindOptions}
                        onChange={(kind) =>
                          form.setFieldValue(
                            ['stages', index, 'progressPercent'],
                            kind === 'queue' ? 0 : kind === 'done' ? 100 : 50,
                          )
                        }
                      />
                    </Form.Item>
                    <Form.Item name={[field.name, 'progressPercent']}>
                      <InputNumber min={0} max={100} precision={0} />
                    </Form.Item>
                  </Space>
                ))}
              </>
            )}
          </Form.List>
        )}
      </Form>
      {board && (
        <>
          <Table<ProductionStage>
            pagination={false}
            rowKey="id"
            size="small"
            dataSource={stages}
            columns={[
              {
                title: 'Колонка',
                render: (_, stage) => (
                  <Input
                    defaultValue={stage.name}
                    onBlur={(event) =>
                      event.target.value.trim() !== stage.name &&
                      run(
                        () =>
                          updateProductionStage(board.id, stage.id, {
                            expectedVersion: board.version,
                            name: event.target.value,
                          }),
                        'Колонка сохранена',
                      )
                    }
                  />
                ),
              },
              {
                title: 'Цвет',
                width: 80,
                render: (_, stage) => (
                  <Input
                    type="color"
                    defaultValue={stage.color}
                    onBlur={(event) =>
                      event.target.value !== stage.color &&
                      run(
                        () =>
                          updateProductionStage(board.id, stage.id, {
                            expectedVersion: board.version,
                            color: event.target.value,
                          }),
                        'Цвет сохранён',
                      )
                    }
                  />
                ),
              },
              {
                title: 'Тип / прогресс',
                render: (_, stage) => (
                  <StageMeaningEditor
                    disabled={Boolean(stage.usedAt)}
                    stage={stage}
                    onSave={(values) =>
                      void run(
                        () =>
                          updateProductionStage(board.id, stage.id, {
                            expectedVersion: board.version,
                            ...values,
                          }),
                        'Тип колонки сохранён',
                      )
                    }
                  />
                ),
              },
              {
                title: 'Действия',
                width: 190,
                render: (_, stage, index) => (
                  <Space>
                    <Button
                      aria-label="Выше"
                      disabled={!index || saving}
                      icon={<ArrowUpOutlined />}
                      onClick={() => moveStage(stage, -1)}
                    />
                    <Button
                      aria-label="Ниже"
                      disabled={index === stages.length - 1 || saving}
                      icon={<ArrowDownOutlined />}
                      onClick={() => moveStage(stage, 1)}
                    />
                    <Popconfirm
                      disabled={
                        !replacementFor(stage) &&
                        stage.id === board.initialStageId
                      }
                      title="Архивировать колонку?"
                      onConfirm={() =>
                        run(
                          () =>
                            archiveProductionStage(board.id, stage.id, {
                              expectedVersion: board.version,
                              initialStageId: replacementFor(stage),
                            }),
                          'Колонка архивирована',
                        )
                      }
                    >
                      <Button
                        aria-label="Архивировать"
                        icon={<InboxOutlined />}
                      />
                    </Popconfirm>
                    <Popconfirm
                      disabled={
                        Boolean(stage.usedAt) ||
                        (!replacementFor(stage) &&
                          stage.id === board.initialStageId)
                      }
                      title="Удалить пустую колонку?"
                      onConfirm={() =>
                        run(
                          () =>
                            deleteProductionStage(board.id, stage.id, {
                              expectedVersion: board.version,
                              initialStageId: replacementFor(stage),
                            }),
                          'Колонка удалена',
                        )
                      }
                    >
                      <Button
                        danger
                        aria-label="Удалить"
                        icon={<DeleteOutlined />}
                      />
                    </Popconfirm>
                  </Space>
                ),
              },
            ]}
          />
          <AddStageForm
            loading={saving}
            onAdd={(values) =>
              void run(
                () =>
                  addProductionStage(board.id, {
                    ...values,
                    expectedVersion: board.version,
                  }),
                'Колонка добавлена',
              )
            }
          />
          {!board.archivedAt && (
            <Popconfirm
              title="Архивировать доску?"
              onConfirm={() =>
                run(
                  () => archiveProductionBoard(board.id, board.version),
                  'Доска архивирована',
                )
              }
            >
              <Button danger icon={<InboxOutlined />}>
                Архивировать доску
              </Button>
            </Popconfirm>
          )}
        </>
      )}
    </Modal>
  );
};
