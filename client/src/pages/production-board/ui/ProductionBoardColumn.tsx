import { HolderOutlined, MoreOutlined } from '@ant-design/icons';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { css } from '@emotion/css';
import {
  Button,
  Dropdown,
  Empty,
  Popover,
  Progress,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { memo, type CSSProperties, type FC, useEffect } from 'react';
import { Link } from 'react-router';

import { ChangeOrderManagementForm } from '@features/change-order-management';
import type {
  ProductionBoard,
  ProductionCard,
  ProductionStage,
} from '@shared/api';

import { useStageCards } from '../api/use-stage-cards';

const styles = {
  column: css`
    display: flex;
    width: 300px;
    min-width: 300px;
    min-height: 0;
    box-sizing: border-box;
    flex-direction: column;
    padding: 10px;
    border: 1px solid var(--app-devider-color);
    border-radius: 8px;
    background: var(--app-body-2-background-color);
  `,
  over: css`
    box-shadow: 0 0 0 2px var(--ant-color-primary);
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  `,
  list: css`
    display: flex;
    min-height: 90px;
    flex: 1;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
  `,
  card: css`
    display: grid;
    grid-template-columns: 26px minmax(0, 1fr);
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--app-devider-color);
    border-radius: 6px;
    background: var(--app-surface-1-background-color);
  `,
  dragging: css`
    opacity: 0.45;
  `,
  cardTop: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  `,
  handle: css`
    display: flex;
    width: 26px;
    min-height: 100%;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    border-right: 1px solid var(--app-devider-color);
    cursor: grab;
    touch-action: none;
    color: var(--ant-color-text-secondary);

    &:hover,
    &:focus-visible {
      color: var(--ant-color-primary);
      background: var(--ant-color-fill-tertiary);
    }
  `,
  cardContent: css`
    display: flex;
    min-width: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    padding: 10px;
  `,
  cardMeta: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  `,
  editButton: css`
    align-self: flex-start;
    padding-inline: 0;
  `,
  loadMore: css`
    margin-top: 8px;
  `,
};

type CardProps = {
  card: ProductionCard;
  stages: ProductionStage[];
  boards: ProductionBoard[];
  disabled: boolean;
  onMove: (card: ProductionCard, stageId: string) => void;
  onTransfer: (card: ProductionCard, boardId: string) => void;
  onManagementSaved: () => void | Promise<void>;
};

export const ProductionBoardCardOverlay: FC<{
  card: ProductionCard;
  stageColor?: string;
}> = ({ card, stageColor }) => (
  <article className={styles.card}>
    <span className={styles.handle} aria-hidden="true">
      <HolderOutlined />
    </span>
    <div className={styles.cardContent}>
      <div className={styles.cardTop}>
        <Typography.Text type="secondary">
          Заказ {card.orderNumber}
        </Typography.Text>
        <MoreOutlined />
      </div>
      <Typography.Text strong>
        №{card.documentNumber} · {card.documentName || 'Без названия'}
      </Typography.Text>
      <div className={styles.cardMeta}>
        <Tag color={card.customStatusColor ?? 'default'} variant="solid">
          {card.customStatusName || 'Без отметки'}
        </Tag>
        <Typography.Text type="secondary">
          Срок:{' '}
          {card.effectiveDueDate
            ? dayjs(card.effectiveDueDate).format('DD.MM.YYYY')
            : 'не задан'}
        </Typography.Text>
      </div>
      <Progress
        percent={card.progressPercent}
        size="small"
        strokeColor={stageColor}
      />
      <Typography.Text type="secondary">
        Изменить срок и отметку
      </Typography.Text>
    </div>
  </article>
);

export const ProductionBoardCard: FC<CardProps> = ({
  card,
  stages,
  boards,
  disabled,
  onMove,
  onTransfer,
  onManagementSaved,
}) => {
  const sortable = useSortable({ id: card.id, disabled });
  const style = {
    transform: CSS.Translate.toString(sortable.transform),
    transition: sortable.transition,
  } as CSSProperties;
  return (
    <article
      ref={sortable.setNodeRef}
      className={`${styles.card} ${sortable.isDragging ? styles.dragging : ''}`}
      style={style}
    >
      <span
        ref={sortable.setActivatorNodeRef}
        {...sortable.attributes}
        {...sortable.listeners}
        className={styles.handle}
        role="button"
        tabIndex={0}
        aria-label={`Переместить документ ${card.documentNumber}`}
      >
        <HolderOutlined />
      </span>
      <div className={styles.cardContent}>
        <div className={styles.cardTop}>
          <Typography.Text type="secondary">
            Заказ {card.orderNumber}
          </Typography.Text>
          <Dropdown
            disabled={disabled}
            menu={{
              items: [
                {
                  key: 'move',
                  label: 'Переместить в…',
                  children: stages
                    .filter(
                      ({ archivedAt, id }) =>
                        !archivedAt && id !== card.stageId,
                    )
                    .map((stage) => ({
                      key: `stage:${stage.id}`,
                      label: stage.name,
                    })),
                },
                {
                  key: 'transfer',
                  label: 'На другую доску…',
                  children: boards
                    .filter(({ archivedAt }) => !archivedAt)
                    .map((board) => ({
                      key: `board:${board.id}`,
                      label: board.name,
                    })),
                },
              ],
              onClick: ({ key }) =>
                key.startsWith('stage:')
                  ? onMove(card, key.slice(6))
                  : onTransfer(card, key.slice(6)),
            }}
          >
            <Button
              aria-label="Действия с карточкой"
              icon={<MoreOutlined />}
              size="small"
              type="text"
            />
          </Dropdown>
        </div>
        <Link
          to={`/order/${card.orderGroupId}?document=${card.documentNumber}`}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Typography.Text strong>
            №{card.documentNumber} · {card.documentName || 'Без названия'}
          </Typography.Text>
        </Link>
        <div className={styles.cardMeta}>
          <Tag color={card.customStatusColor ?? 'default'} variant="solid">
            {card.customStatusName || 'Без отметки'}
          </Tag>
          <Typography.Text type="secondary">
            Срок:{' '}
            {card.effectiveDueDate
              ? dayjs(card.effectiveDueDate).format('DD.MM.YYYY')
              : 'не задан'}
          </Typography.Text>
        </div>
        <Progress
          percent={card.progressPercent}
          size="small"
          strokeColor={stages.find(({ id }) => id === card.stageId)?.color}
        />
        <Popover
          trigger="click"
          title="Срок и отметка"
          content={
            <ChangeOrderManagementForm
              scope="document"
              targetId={card.orderId}
              groupId={card.orderGroupId}
              onSaved={onManagementSaved}
            />
          }
        >
          <Button className={styles.editButton} size="small" type="link">
            Изменить срок и отметку
          </Button>
        </Popover>
      </div>
    </article>
  );
};

type Props = {
  boardId: string;
  stage: ProductionStage;
  stages: ProductionStage[];
  boards: ProductionBoard[];
  override?: ProductionCard[];
  disabled: boolean;
  onCards: (stageId: string, cards: ProductionCard[]) => void;
  onMove: CardProps['onMove'];
  onTransfer: CardProps['onTransfer'];
  onManagementSaved: CardProps['onManagementSaved'];
  onRefreshReady: (stageId: string, refresh: () => Promise<unknown>) => void;
};

export const ProductionBoardColumn = memo<Props>(
  ({
    boardId,
    stage,
    stages,
    boards,
    override,
    disabled,
    onCards,
    onMove,
    onTransfer,
    onManagementSaved,
    onRefreshReady,
  }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `stage:${stage.id}`,
      disabled,
    });
    const query = useStageCards(boardId, stage.id, onCards);
    const cards = override ?? query.cards;
    const refreshCards = query.mutate;

    useEffect(() => {
      onRefreshReady(stage.id, () => refreshCards());
    }, [onRefreshReady, refreshCards, stage.id]);

    return (
      <section className={`${styles.column} ${isOver ? styles.over : ''}`}>
        <header className={styles.header}>
          <Space>
            <Tag color={stage.color} variant="solid">
              {stage.name}
            </Tag>
            <Typography.Text type="secondary">
              {stage.progressPercent}%
            </Typography.Text>
          </Space>
        </header>
        <div ref={setNodeRef} className={styles.list}>
          {query.isLoading ? (
            <Skeleton active />
          ) : (
            <SortableContext
              items={cards.map(({ id }) => id)}
              strategy={verticalListSortingStrategy}
            >
              {cards.length ? (
                cards.map((card) => (
                  <ProductionBoardCard
                    key={card.id}
                    card={card}
                    stages={stages}
                    boards={boards}
                    disabled={disabled}
                    onMove={onMove}
                    onTransfer={onTransfer}
                    onManagementSaved={onManagementSaved}
                  />
                ))
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Колонка пуста"
                />
              )}
            </SortableContext>
          )}
        </div>
        {query.error && (
          <Typography.Text type="danger">
            Не удалось загрузить карточки
          </Typography.Text>
        )}
        {query.hasMore && (
          <Button
            className={styles.loadMore}
            block
            loading={query.isValidating}
            onClick={() => query.setSize(query.size + 1)}
          >
            Загрузить ещё
          </Button>
        )}
      </section>
    );
  },
);
