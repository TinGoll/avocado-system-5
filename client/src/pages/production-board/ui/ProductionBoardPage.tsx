import { PlusOutlined, SettingOutlined } from '@ant-design/icons';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { css } from '@emotion/css';
import {
  Alert,
  App,
  Button,
  Empty,
  Form,
  Modal,
  Select,
  Skeleton,
  Space,
  Typography,
} from 'antd';
import type { AxiosError } from 'axios';
import { type FC, useCallback, useMemo, useRef, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';

import type { OrderGroup } from '@entities/order';
import {
  assignProductionCard,
  getProductionBoard,
  getProductionBoards,
  moveProductionCard,
  productionBoardKeys,
  transferProductionCard,
  type ProductionCard,
} from '@shared/api';
import { Endpoints, fetcher } from '@shared/lib/swr';

import {
  moveCardInSnapshot,
  type StageCardsSnapshot,
} from '../model/production-board';

import {
  ProductionBoardCardOverlay,
  ProductionBoardColumn,
} from './ProductionBoardColumn';
import { ProductionBoardEditor } from './ProductionBoardEditor';

const styles = {
  page: css`
    display: flex;
    height: 100%;
    min-height: 0;
    box-sizing: border-box;
    flex-direction: column;
    padding: 18px;
  `,
  toolbar: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
    flex-wrap: wrap;
  `,
  board: css`
    display: flex;
    min-height: 0;
    flex: 1;
    align-items: stretch;
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 12px;
  `,
  overlay: css`
    width: 280px;
    box-shadow: var(--ant-box-shadow-secondary);
    cursor: grabbing;
  `,
  assignControl: css`
    width: 100%;
    margin-bottom: 12px;
  `,
};

type SearchResponse = { items: OrderGroup[] };

export const ProductionBoardPage: FC = () => {
  const { message } = App.useApp();
  const { mutate: globalMutate } = useSWRConfig();
  const boardsQuery = useSWR(productionBoardKeys.list, getProductionBoards);
  const boards = boardsQuery.data?.items ?? [];
  const [selectedId, setSelectedId] = useState<string>();
  const boardId =
    selectedId ?? boards.find(({ archivedAt }) => !archivedAt)?.id;
  const boardQuery = useSWR(
    boardId ? productionBoardKeys.board(boardId) : null,
    () => getProductionBoard(boardId!),
  );
  const board = boardQuery.data;
  const stages = useMemo(
    () =>
      board?.stages
        ?.filter(({ archivedAt }) => !archivedAt)
        .sort((a, b) => a.position - b.position) ?? [],
    [board],
  );
  const cardsRef = useRef<StageCardsSnapshot>({});
  const cardRefreshersRef = useRef<Record<string, () => Promise<unknown>>>({});
  const [override, setOverride] = useState<StageCardsSnapshot>();
  const [moving, setMoving] = useState(false);
  const [activeCard, setActiveCard] = useState<ProductionCard>();
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm] = Form.useForm<{ orderId: string }>();
  const [search, setSearch] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<number>();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const searchQuery = useSWR<SearchResponse>(
    search.trim().length >= 2
      ? `${Endpoints.ORDER_GROUPS}/search?q=${encodeURIComponent(search.trim())}&limit=20`
      : null,
    (url: string) => fetcher<SearchResponse>({ url }),
  );
  const selectedGroup = searchQuery.data?.items.find(
    ({ id }) => id === selectedGroupId,
  );

  const registerCards = useCallback(
    (stageId: string, cards: ProductionCard[]) => {
      cardsRef.current = { ...cardsRef.current, [stageId]: cards };
    },
    [],
  );

  const registerCardRefresher = useCallback(
    (stageId: string, refresh: () => Promise<unknown>) => {
      cardRefreshersRef.current[stageId] = refresh;
    },
    [],
  );

  const refreshBoard = useCallback(async () => {
    if (!boardId) return;
    await Promise.all([
      boardQuery.mutate(),
      boardsQuery.mutate(),
      globalMutate(
        (key) =>
          typeof key === 'string' &&
          key.startsWith(`production-boards/${boardId}/cards?`),
      ),
      ...Object.values(cardRefreshersRef.current).map((refresh) => refresh()),
    ]);
  }, [boardId, boardQuery, boardsQuery, globalMutate]);

  const moveCard = useCallback(
    async (
      card: ProductionCard,
      targetStageId: string,
      beforeCardId: string | null = null,
    ) => {
      if (
        !board ||
        moving ||
        (card.stageId === targetStageId && beforeCardId === card.id)
      )
        return;
      const previous = cardsRef.current;
      const optimistic = moveCardInSnapshot(
        previous,
        card.id,
        targetStageId,
        beforeCardId,
      );
      setOverride(optimistic);
      setMoving(true);
      try {
        await moveProductionCard(card.id, {
          targetStageId,
          beforeCardId,
          expectedCardVersion: card.version,
          expectedBoardVersion: board.version,
          expectedGroupVersion: card.groupVersion,
        });
        message.success('Документ перемещён');
      } catch (caught) {
        setOverride(previous);
        message.error(
          (caught as AxiosError).response?.status === 409
            ? 'Данные изменились в другом окне. Доска обновлена.'
            : 'Перемещение не подтверждено сервером. Доска перечитана.',
        );
      } finally {
        await refreshBoard();
        setOverride(undefined);
        setMoving(false);
      }
    },
    [board, message, moving, refreshBoard],
  );

  const transferCard = useCallback(
    async (card: ProductionCard, targetBoardId: string) => {
      if (!board || moving || targetBoardId === board.id) return;
      setMoving(true);
      try {
        const target = await getProductionBoard(targetBoardId);
        await transferProductionCard(card.id, {
          targetBoardId,
          targetStageId: target.initialStageId,
          beforeCardId: null,
          expectedCardVersion: card.version,
          expectedBoardVersion: board.version,
          expectedTargetBoardVersion: target.version,
          expectedGroupVersion: card.groupVersion,
        });
        message.success('Документ перенесён на другую доску');
      } catch {
        message.error('Перенос отклонён. Данные досок обновлены.');
      } finally {
        await refreshBoard();
        setMoving(false);
      }
    },
    [board, message, moving, refreshBoard],
  );

  const findCard = (id: string) =>
    Object.values(cardsRef.current)
      .flat()
      .find((card) => card.id === id);
  const handleDragStart = ({ active }: DragStartEvent) =>
    setActiveCard(findCard(String(active.id)));
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveCard(undefined);
    if (!over) return;
    const card = findCard(String(active.id));
    if (!card) return;
    const overId = String(over.id);
    const neighbor = findCard(overId);
    const targetStageId = overId.startsWith('stage:')
      ? overId.slice(6)
      : neighbor?.stageId;
    if (!targetStageId) return;
    let beforeCardId = neighbor?.id ?? null;
    if (neighbor && neighbor.stageId === card.stageId) {
      const cards = cardsRef.current[card.stageId] ?? [];
      const from = cards.findIndex(({ id }) => id === card.id);
      const to = cards.findIndex(({ id }) => id === neighbor.id);
      if (from < to) beforeCardId = cards[to + 1]?.id ?? null;
    }
    void moveCard(card, targetStageId, beforeCardId);
  };

  const assign = async ({ orderId }: { orderId: string }) => {
    if (!board || !selectedGroup) return;
    setMoving(true);
    try {
      await assignProductionCard(board.id, {
        orderId,
        expectedBoardVersion: board.version,
        expectedGroupVersion: selectedGroup.managementVersion ?? 0,
      });
      setAssignOpen(false);
      setSearch('');
      setSelectedGroupId(undefined);
      assignForm.resetFields();
      await refreshBoard();
      message.success('Документ добавлен на доску');
    } catch {
      await refreshBoard();
      message.error('Не удалось добавить документ');
    } finally {
      setMoving(false);
    }
  };

  return (
    <section className={styles.page}>
      <div className={styles.toolbar}>
        <Typography.Title level={3}>Производство</Typography.Title>
        <Space wrap>
          <Select
            value={boardId}
            placeholder="Выберите доску"
            size="small"
            loading={boardsQuery.isLoading}
            options={boards.map((item) => ({
              value: item.id,
              label: `${item.name}${item.archivedAt ? ' (архив)' : ''}`,
            }))}
            onChange={setSelectedId}
          />
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setEditorMode('create')}
          >
            Создать доску
          </Button>
          <Button
            size="small"
            disabled={!board}
            icon={<SettingOutlined />}
            onClick={() => setEditorMode('edit')}
          >
            Настроить доску
          </Button>
          <Button
            size="small"
            type="primary"
            disabled={!board || Boolean(board.archivedAt)}
            onClick={() => setAssignOpen(true)}
          >
            Добавить документ
          </Button>
        </Space>
      </div>
      {boardsQuery.error || boardQuery.error ? (
        <Alert
          showIcon
          type="error"
          title="Не удалось загрузить производственную доску"
        />
      ) : boardQuery.isLoading ? (
        <Skeleton active />
      ) : !board ? (
        <Empty description="Создайте первую производственную доску" />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragCancel={() => setActiveCard(undefined)}
          onDragEnd={handleDragEnd}
        >
          <div className={styles.board}>
            {stages.map((stage) => (
              <ProductionBoardColumn
                key={stage.id}
                boardId={board.id}
                stage={stage}
                stages={stages}
                boards={boards.filter(({ id }) => id !== board.id)}
                override={override?.[stage.id]}
                disabled={moving || Boolean(board.archivedAt)}
                onCards={registerCards}
                onMove={(card, stageId) => void moveCard(card, stageId)}
                onTransfer={(card, targetId) =>
                  void transferCard(card, targetId)
                }
                onManagementSaved={refreshBoard}
                onRefreshReady={registerCardRefresher}
              />
            ))}
          </div>
          <DragOverlay adjustScale={false} dropAnimation={null}>
            {activeCard && (
              <div className={styles.overlay}>
                <ProductionBoardCardOverlay
                  card={activeCard}
                  stageColor={
                    stages.find(({ id }) => id === activeCard.stageId)?.color
                  }
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
      <ProductionBoardEditor
        open={editorMode !== null}
        board={editorMode === 'edit' ? board : undefined}
        onClose={() => setEditorMode(null)}
        onSaved={(saved) => {
          setSelectedId(saved.id);
          void boardsQuery.mutate();
          if (editorMode === 'edit') void boardQuery.mutate(saved);
          else void globalMutate(productionBoardKeys.board(saved.id), saved);
          if (editorMode === 'create' || saved.archivedAt) setEditorMode(null);
        }}
      />
      <Modal
        footer={null}
        open={assignOpen}
        title="Добавить документ"
        onCancel={() => {
          setAssignOpen(false);
          setSearch('');
          setSelectedGroupId(undefined);
          assignForm.resetFields();
        }}
      >
        <Select
          allowClear
          className={styles.assignControl}
          filterOption={false}
          showSearch
          placeholder="Номер заказа, клиент или документ"
          value={selectedGroupId}
          loading={searchQuery.isLoading}
          notFoundContent={
            search.trim().length < 2
              ? 'Введите минимум 2 символа'
              : 'Заказы не найдены'
          }
          options={(searchQuery.data?.items ?? []).map((group) => ({
            value: group.id,
            label: `Заказ ${group.orderNumber} · ${group.customer?.name ?? 'Заказчик не указан'}`,
          }))}
          onClear={() => {
            setSearch('');
            setSelectedGroupId(undefined);
            assignForm.resetFields(['orderId']);
          }}
          onSearch={(value) => {
            setSearch(value);
            if (selectedGroupId) {
              setSelectedGroupId(undefined);
              assignForm.resetFields(['orderId']);
            }
          }}
          onChange={(groupId) => {
            setSelectedGroupId(groupId);
            assignForm.resetFields(['orderId']);
          }}
        />
        <Form form={assignForm} onFinish={assign}>
          <Form.Item
            name="orderId"
            rules={[{ required: true, message: 'Выберите документ' }]}
          >
            <Select
              className={styles.assignControl}
              disabled={!selectedGroup}
              placeholder="Выберите документ"
              options={(selectedGroup?.orders ?? []).map((order) => ({
                value: order.id,
                label: `№${order.documentNumber} · ${order.name || 'Без названия'}`,
              }))}
            />
          </Form.Item>
          <Button htmlType="submit" loading={moving} type="primary">
            Добавить в очередь
          </Button>
        </Form>
      </Modal>
    </section>
  );
};
