import { css } from '@emotion/css';
import { Button, List, Typography } from 'antd';
import dayjs from 'dayjs';
import type { FC } from 'react';
import useSWRInfinite from 'swr/infinite';

import {
  getOrderManagementHistory,
  orderManagementKeys,
  type OrderManagementEvent,
} from '@shared/api';
import { DATE_DEFAULT_FORMAT } from '@shared/lib';

const PAGE_SIZE = 50;

const styles = {
  container: css`
    margin-top: 12px;
    padding: 12px;
    border: 1px solid var(--app-devider-color);
    border-radius: 6px;
  `,
};

const eventLabels: Record<string, string> = {
  due_date_changed: 'Изменён срок',
  custom_status_changed: 'Изменена пользовательская отметка',
  lifecycle_changed: 'Изменено состояние заказа',
  stage_changed: 'Изменён этап производства',
  board_assigned: 'Документ назначен на доску',
  board_removed: 'Документ снят с доски',
  board_changed: 'Документ перенесён на другую доску',
  document_deleted: 'Документ удалён',
  group_deleted: 'Заказ удалён',
};

const targetName = (event: OrderManagementEvent) => {
  const snapshot = event.targetSnapshot;
  if (snapshot.documentNumber !== null) {
    return `Документ №${snapshot.documentNumber}${
      snapshot.documentName ? ` «${snapshot.documentName}»` : ''
    }`;
  }
  return snapshot.orderNumber ? `Заказ №${snapshot.orderNumber}` : 'Заказ';
};

const snapshotLabel = (snapshot: Record<string, unknown>): string => {
  if (typeof snapshot.stageName === 'string') {
    return typeof snapshot.boardName === 'string'
      ? `${snapshot.boardName} · ${snapshot.stageName}`
      : snapshot.stageName;
  }
  const value =
    snapshot.boardName ?? snapshot.name ?? snapshot.status ?? snapshot.dueDate;
  return typeof value === 'string' && value ? value : '—';
};

const changeDescription = (event: OrderManagementEvent): string => {
  const transition = `${snapshotLabel(event.before)} → ${snapshotLabel(event.after)}`;
  return event.reason ? `${transition} · Причина: ${event.reason}` : transition;
};

type Props = { groupId: number };

export const OrderManagementHistory: FC<Props> = ({ groupId }) => {
  const { data, isLoading, isValidating, setSize, size } = useSWRInfinite(
    (pageIndex, previousPage) => {
      if (previousPage?.meta.nextOffset === null) return null;
      const offset = previousPage?.meta.nextOffset ?? 0;
      return pageIndex === 0
        ? orderManagementKeys.history(groupId)
        : `order-management/history?orderGroupId=${groupId}&offset=${offset}&limit=${PAGE_SIZE}`;
    },
    (url: string) => {
      const offset = Number(
        new URLSearchParams(url.split('?')[1]).get('offset'),
      );
      return getOrderManagementHistory(groupId, offset, PAGE_SIZE);
    },
  );
  const items = data?.flatMap((page) => page.items) ?? [];
  const nextOffset = data?.at(-1)?.meta.nextOffset ?? null;

  return (
    <section className={styles.container} aria-label="История изменений">
      <Typography.Title level={5}>История изменений</Typography.Title>
      <List
        dataSource={items}
        loading={isLoading}
        locale={{ emptyText: 'Изменений пока нет' }}
        renderItem={(event) => (
          <List.Item>
            <List.Item.Meta
              title={`${eventLabels[event.type] || event.type} · ${targetName(event)}`}
              description={
                <>
                  {dayjs(event.occurredAt).format(
                    `${DATE_DEFAULT_FORMAT} HH:mm`,
                  )}{' '}
                  · {changeDescription(event)}
                </>
              }
            />
          </List.Item>
        )}
      />
      {nextOffset !== null && (
        <Button loading={isValidating} onClick={() => void setSize(size + 1)}>
          Показать ещё
        </Button>
      )}
    </section>
  );
};
