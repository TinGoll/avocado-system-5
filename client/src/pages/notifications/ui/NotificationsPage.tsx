import { css } from '@emotion/css';
import {
  Alert,
  Button,
  Empty,
  List,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
} from 'antd';
import { type FC, useMemo, useState } from 'react';
import useSWR from 'swr';

import {
  type BusinessNotification,
  getNotifications,
  NotificationMessage,
  notificationKeys,
  setNotificationRead,
} from '@entities/notification';

const styles = {
  page: css`
    max-width: 1000px;
    margin: 0 auto;
    padding: 24px;
  `,
  item: css`
    width: 100%;
    opacity: 1;
  `,
  resolved: css`
    opacity: 0.6;
  `,
  stack: css`
    width: 100%;
  `,
};

export const NotificationsPage: FC = () => {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [older, setOlder] = useState<BusinessNotification[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const { data, error, isLoading, mutate } = useSWR(
    notificationKeys.feed(),
    () => getNotifications(),
    {
      revalidateOnFocus: true,
      onSuccess: (page) => setNextCursor(page.meta.nextCursor),
    },
  );
  const items = useMemo(() => {
    const unique = new Map(
      [...(data?.items ?? []), ...older].map((item) => [item.id, item]),
    );
    return [...unique.values()].filter((item) => !unreadOnly || !item.readAt);
  }, [data, older, unreadOnly]);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await getNotifications(nextCursor);
      setOlder((current) => [...current, ...page.items]);
      setNextCursor(page.meta.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  const updateLocalRead = async (item: BusinessNotification) => {
    const readAt = new Date().toISOString();
    setOlder((current) =>
      current.map((value) =>
        value.id === item.id ? { ...value, readAt } : value,
      ),
    );
    await mutate(
      (page) =>
        page
          ? {
              ...page,
              items: page.items.map((value) =>
                value.id === item.id ? { ...value, readAt } : value,
              ),
            }
          : page,
      { revalidate: false },
    );
  };

  const markRead = async (item: BusinessNotification) => {
    await setNotificationRead(item.id);
    await updateLocalRead(item);
  };

  return (
    <section className={styles.page}>
      <Space className={styles.stack} orientation="vertical" size="large">
        <Space wrap>
          <Typography.Title level={2}>Уведомления</Typography.Title>
          <Switch
            checked={unreadOnly}
            checkedChildren="Непрочитанные"
            unCheckedChildren="Все"
            onChange={setUnreadOnly}
          />
        </Space>
        {error && (
          <Alert
            showIcon
            type="error"
            message="Не удалось загрузить уведомления"
          />
        )}
        {isLoading ? (
          <Spin aria-label="Загрузка уведомлений" />
        ) : items.length ? (
          <List
            dataSource={items}
            renderItem={(item) => (
              <List.Item
                actions={
                  item.readAt
                    ? []
                    : [
                        <Button key="read" onClick={() => void markRead(item)}>
                          Прочитано
                        </Button>,
                      ]
                }
              >
                <Space
                  className={`${styles.item} ${item.resolvedAt ? styles.resolved : ''}`}
                  orientation="vertical"
                >
                  <Space wrap>
                    {!item.readAt && <Tag color="blue">Новое</Tag>}
                    {item.resolvedAt && <Tag>Завершено</Tag>}
                    <Typography.Text type="secondary">
                      {new Date(item.createdAt).toLocaleString('ru-RU')}
                    </Typography.Text>
                  </Space>
                  <NotificationMessage
                    item={item}
                    onRead={() => void updateLocalRead(item)}
                  />
                </Space>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="Уведомлений нет" />
        )}
        {nextCursor && (
          <Button loading={loadingMore} onClick={() => void loadMore()}>
            Загрузить ещё
          </Button>
        )}
      </Space>
    </section>
  );
};
