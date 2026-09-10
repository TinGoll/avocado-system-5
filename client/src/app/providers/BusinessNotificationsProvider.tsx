import { App as AntApp } from 'antd';
import type { FC, ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import useSWR from 'swr';

import {
  getNotifications,
  NotificationMessage,
  notificationKeys,
  readShownNotificationIds,
  saveShownNotificationIds,
  shownNotificationsKey,
} from '@entities/notification';

type Props = { children: ReactNode };

export const BusinessNotificationsProvider: FC<Props> = ({ children }) => {
  const { notification } = AntApp.useApp();
  const navigate = useNavigate();
  const shown = useRef(readShownNotificationIds());
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
      if (event.key === shownNotificationsKey())
        shown.current = readShownNotificationIds();
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    const candidates = (data?.items ?? []).filter(
      (item) => !item.readAt && !item.resolvedAt && !shown.current.has(item.id),
    );
    if (!candidates.length) return;
    candidates.forEach((item) => shown.current.add(item.id));
    saveShownNotificationIds(shown.current);

    const visible = candidates.length > 3 ? candidates.slice(0, 2) : candidates;
    visible.forEach((item) =>
      notification.open({
        key: `business-${item.id}`,
        placement: 'bottomRight',
        title: item.severity === 'error' ? 'Важно' : 'Уведомление',
        description: (
          <NotificationMessage item={item} onRead={() => void mutate()} />
        ),
      }),
    );
    if (candidates.length > 3)
      notification.open({
        key: 'business-summary',
        placement: 'bottomRight',
        title: `Есть ${candidates.length - 2} уведомлений`,
        description: 'Откройте ленту, чтобы посмотреть остальные сообщения.',
        onClick: () => navigate('/notifications'),
      });
  }, [data, mutate, navigate, notification]);

  return children;
};
