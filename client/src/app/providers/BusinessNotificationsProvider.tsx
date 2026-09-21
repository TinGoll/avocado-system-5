import { RightOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import { App as AntApp, Badge, Button, Space, Typography } from 'antd';
import type { FC, ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import useSWR from 'swr';

import {
  dismissedNotificationsKey,
  getNotifications,
  notificationKeys,
  NotificationPopupItem,
  readDismissedNotificationIds,
  saveDismissedNotificationIds,
  setNotificationRead,
} from '@entities/notification';

type Props = { children: ReactNode };

const styles = {
  notification: css`
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);

    .ant-notification-notice-message {
      margin-bottom: 12px;
    }

    .ant-notification-notice-description {
      margin-inline-start: 0;
    }

    .ant-notification-notice-actions {
      width: 100%;
      margin-top: 12px;
    }
  `,
  title: css`
    font-weight: 600;
  `,
  list: css`
    width: 100%;
  `,
  history: css`
    display: flex;
    width: 100%;
    height: auto;
    justify-content: flex-start;
    gap: 10px;
    padding: 12px 0 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0;

    &:hover {
      background: transparent !important;
    }
  `,
  historyLabel: css`
    flex: 1;
    text-align: left;
  `,
};

export const BusinessNotificationsProvider: FC<Props> = ({ children }) => {
  const { notification } = AntApp.useApp();
  const navigate = useNavigate();
  const dismissed = useRef(readDismissedNotificationIds());
  const opened = useRef(new Set<string>());
  const { data, mutate } = useSWR(
    notificationKeys.feed(),
    () => getNotifications(),
    {
      refreshInterval: 120_000,
      refreshWhenHidden: false,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 10_000,
    },
  );

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === dismissedNotificationsKey())
        dismissed.current = readDismissedNotificationIds();
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    const candidates = (data?.items ?? []).filter(
      (item) =>
        !item.readAt &&
        !item.resolvedAt &&
        !dismissed.current.has(item.id) &&
        !opened.current.has(item.id),
    );
    if (!candidates.length) return;

    const markClosedNotificationsRead = async () => {
      const results = await Promise.allSettled(
        candidates.map((item) => setNotificationRead(item.id)),
      );
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          dismissed.current.add(candidates[index].id);
        }
      });
      saveDismissedNotificationIds(dismissed.current);
      await mutate();
    };

    candidates.forEach((item) => opened.current.add(item.id));
    notification.open({
      key: `business-batch-${candidates[0].id}`,
      className: styles.notification,
      placement: 'bottomRight',
      duration: false,
      title: (
        <Space size="small">
          <Typography.Text className={styles.title}>
            Уведомления
          </Typography.Text>
          <Badge count={candidates.length} />
        </Space>
      ),
      description: (
        <Space className={styles.list} orientation="vertical" size="small">
          {candidates.map((item) => (
            <NotificationPopupItem
              key={item.id}
              item={item}
              onNavigate={navigate}
              onRead={() => void mutate()}
            />
          ))}
        </Space>
      ),
      actions: (
        <Button
          block
          className={styles.history}
          type="link"
          onClick={() => navigate('/notifications')}
        >
          <UnorderedListOutlined />
          <span className={styles.historyLabel}>Все уведомления</span>
          <RightOutlined />
        </Button>
      ),
      onClose: () => {
        candidates.forEach((item) => {
          opened.current.delete(item.id);
        });
        void markClosedNotificationsRead();
      },
    });
  }, [data, mutate, navigate, notification]);

  return children;
};
