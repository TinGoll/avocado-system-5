import { backgroundFetcher, fetcher } from '@shared/lib/swr';

import type {
  BusinessNotification,
  NotificationPage,
} from '../model/notification';

export const notificationKeys = {
  feed: (cursor?: string | null) =>
    `notifications?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
};

export const getNotifications = (cursor?: string | null) =>
  backgroundFetcher<NotificationPage>(notificationKeys.feed(cursor));

export const setNotificationRead = (id: string, read = true) =>
  fetcher<BusinessNotification, { read: boolean }>({
    url: `notifications/${id}/read`,
    method: 'PATCH',
    data: { read },
  });
