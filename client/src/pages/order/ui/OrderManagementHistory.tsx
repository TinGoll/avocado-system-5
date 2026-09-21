import { ClockCircleOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import { Button, Empty, Select, Skeleton, Typography } from 'antd';
import dayjs from 'dayjs';
import { type FC, useMemo, useState } from 'react';
import useSWRInfinite from 'swr/infinite';

import {
  getOrderManagementHistory,
  orderManagementKeys,
  type OrderManagementEvent,
} from '@shared/api';
import { DATE_DEFAULT_FORMAT } from '@shared/lib';

const PAGE_SIZE = 50;
const productionEventTypes = new Set([
  'stage_changed',
  'board_assigned',
  'board_removed',
  'board_changed',
]);

const styles = {
  container: css`
    min-width: 0;
    min-height: 770px;
    padding: 16px 18px 20px;
    border: 1px solid #303a46;
    border-radius: 8px;
    background: #111820;
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #26313d;
  `,
  title: css`
    display: flex;
    align-items: center;
    gap: 8px;
    &.ant-typography {
      margin: 0;
      color: #f0f0f0;
      font-size: 18px;
    }
  `,
  filter: css`
    width: 168px;
    &.ant-select .ant-select-selector {
      border-color: transparent;
      background: #181d23;
      box-shadow: none;
    }
  `,
  loading: css`
    padding-top: 24px;
  `,
  empty: css`
    padding-top: 80px;
  `,
  group: css`
    position: relative;
    padding-top: 12px;
  `,
  date: css`
    margin-bottom: 8px;
    color: #bfbfbf;
    font-size: 14px;
    font-weight: 500;
  `,
  events: css`
    position: relative;
    &::before {
      position: absolute;
      top: 13px;
      bottom: 13px;
      left: 10px;
      width: 1px;
      background: #405061;
      content: '';
    }
  `,
  event: css`
    position: relative;
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr);
    column-gap: 12px;
    min-height: 74px;
    padding-left: 34px;
  `,
  dot: css`
    position: absolute;
    top: 7px;
    left: 5px;
    z-index: 1;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #c7d2e0;
  `,
  dotProduction: css`
    background: #1677ff;
  `,
  dotLifecycle: css`
    background: #2fb344;
  `,
  time: css`
    padding-top: 3px;
    color: #8c9caf;
    font-size: 13px;
  `,
  eventTitle: css`
    color: #f0f0f0;
    font-size: 14px;
    font-weight: 500;
    line-height: 20px;
  `,
  eventTitleProduction: css`
    color: #40a9ff;
  `,
  eventTitleLifecycle: css`
    color: #52c41a;
  `,
  description: css`
    margin-top: 3px;
    overflow-wrap: anywhere;
    color: #bfbfbf;
    font-size: 13px;
    line-height: 18px;
  `,
  target: css`
    margin-top: 3px;
    color: #8c9caf;
    font-size: 13px;
    line-height: 18px;
  `,
  more: css`
    display: block;
    margin: 8px auto 0;
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
    return `Документ №${snapshot.documentNumber}${snapshot.documentName ? ` · ${snapshot.documentName}` : ''}`;
  }
  return snapshot.orderNumber ? `Заказ №${snapshot.orderNumber}` : 'Заказ';
};

const snapshotLabel = (snapshot: Record<string, unknown>): string => {
  if (typeof snapshot.stageName === 'string') {
    return typeof snapshot.boardName === 'string'
      ? `${snapshot.boardName} · ${snapshot.stageName}`
      : snapshot.stageName;
  }
  if (Array.isArray(snapshot.names))
    return snapshot.names.length ? snapshot.names.join(', ') : '—';
  const value =
    snapshot.boardName ?? snapshot.name ?? snapshot.status ?? snapshot.dueDate;
  return typeof value === 'string' && value ? value : '—';
};

const changeDescription = (event: OrderManagementEvent): string => {
  const transition = `${snapshotLabel(event.before)} → ${snapshotLabel(event.after)}`;
  return event.reason ? `${transition} · Причина: ${event.reason}` : transition;
};

const formatDateHeading = (date: string) => {
  const value = dayjs(date);
  if (value.isSame(dayjs(), 'day'))
    return `Сегодня, ${value.format(DATE_DEFAULT_FORMAT)}`;
  if (value.isSame(dayjs().subtract(1, 'day'), 'day'))
    return `Вчера, ${value.format(DATE_DEFAULT_FORMAT)}`;
  return value.format(DATE_DEFAULT_FORMAT);
};

type FilterValue = 'all' | 'production' | 'order';
type Props = { groupId: number };

export const OrderManagementHistory: FC<Props> = ({ groupId }) => {
  const [filter, setFilter] = useState<FilterValue>('all');
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
  const items = useMemo(() => {
    const events = data?.flatMap((page) => page.items) ?? [];
    if (filter === 'production')
      return events.filter(({ type }) => productionEventTypes.has(type));
    if (filter === 'order')
      return events.filter(({ type }) => !productionEventTypes.has(type));
    return events;
  }, [data, filter]);
  const groupedItems = useMemo(
    () =>
      Object.entries(
        items.reduce<Record<string, OrderManagementEvent[]>>(
          (groups, event) => {
            const date = dayjs(event.occurredAt).format('YYYY-MM-DD');
            (groups[date] ??= []).push(event);
            return groups;
          },
          {},
        ),
      ),
    [items],
  );
  const nextOffset = data?.at(-1)?.meta.nextOffset ?? null;

  return (
    <section className={styles.container} aria-label="История изменений">
      <div className={styles.header}>
        <Typography.Title className={styles.title} level={5}>
          <ClockCircleOutlined />
          История изменений
        </Typography.Title>
        <Select<FilterValue>
          className={styles.filter}
          onChange={setFilter}
          options={[
            { label: 'Все события', value: 'all' },
            { label: 'Производство', value: 'production' },
            { label: 'Заказ', value: 'order' },
          ]}
          value={filter}
        />
      </div>

      {isLoading ? (
        <Skeleton active className={styles.loading} paragraph={{ rows: 8 }} />
      ) : groupedItems.length === 0 ? (
        <Empty
          className={styles.empty}
          description="Изменений пока нет"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        groupedItems.map(([date, events]) => (
          <div className={styles.group} key={date}>
            <div className={styles.date}>{formatDateHeading(date)}</div>
            <div className={styles.events}>
              {events?.map((event) => {
                const isProduction = productionEventTypes.has(event.type);
                const isLifecycle = event.type === 'lifecycle_changed';
                return (
                  <article className={styles.event} key={event.id}>
                    <span
                      className={`${styles.dot} ${isProduction ? styles.dotProduction : isLifecycle ? styles.dotLifecycle : ''}`}
                    />
                    <time className={styles.time} dateTime={event.occurredAt}>
                      {dayjs(event.occurredAt).format('HH:mm')}
                    </time>
                    <div>
                      <div
                        className={`${styles.eventTitle} ${isProduction ? styles.eventTitleProduction : isLifecycle ? styles.eventTitleLifecycle : ''}`}
                      >
                        {eventLabels[event.type] || event.type}
                      </div>
                      <div className={styles.description}>
                        {changeDescription(event)}
                      </div>
                      <div className={styles.target}>{targetName(event)}</div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))
      )}

      {nextOffset !== null && (
        <Button
          className={styles.more}
          loading={isValidating}
          onClick={() => void setSize(size + 1)}
          type="link"
        >
          Показать ещё
        </Button>
      )}
    </section>
  );
};
