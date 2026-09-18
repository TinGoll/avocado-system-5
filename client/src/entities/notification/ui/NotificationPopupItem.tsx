import { FileTextOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import { Button, Typography } from 'antd';
import type { FC } from 'react';

import { setNotificationRead } from '../api/notification-api';
import type {
  BusinessNotification,
  NotificationLinkTarget,
} from '../model/notification';

const styles = {
  item: css`
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
    padding: 10px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.035);

    &:hover {
      background: rgba(22, 119, 255, 0.09);
    }
  `,
  icon: css`
    display: flex;
    width: 40px;
    height: 40px;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: #fff;
    font-size: 18px;
    background: linear-gradient(145deg, #245ca8, #1677ff);
  `,
  orderIcon: css`
    background: linear-gradient(145deg, #5145a7, #7b61ff);
  `,
  content: css`
    min-width: 0;
  `,
  title: css`
    max-width: 100%;
    height: auto;
    padding: 0;
    overflow: hidden;
    color: rgba(255, 255, 255, 0.88);
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  details: css`
    display: block;
    margin-top: 2px;
    font-size: 12px;
  `,
  meta: css`
    display: flex;
    height: 40px;
    flex-direction: column;
    align-items: flex-end;
    justify-content: space-between;
  `,
  time: css`
    font-size: 12px;
  `,
  unread: css`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #1677ff;
    box-shadow: 0 0 8px rgba(22, 119, 255, 0.85);
  `,
};

type Props = {
  item: BusinessNotification;
  onNavigate: (path: string) => void;
  onRead?: () => void;
};

const getDetails = (item: BusinessNotification) => {
  const details = item.message
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('')
    .trim()
    .replace(/^:\s*/, '');

  if (!details) return 'Срок: не указан';
  return details.replace(/^срок\s*:?\s*/i, 'Срок: ');
};

export const NotificationPopupItem: FC<Props> = ({
  item,
  onNavigate,
  onRead,
}) => {
  const link = item.message.find((part) => part.type === 'link');
  const isDocument = item.orderId !== null || link?.target.type === 'document';

  const follow = async (target: NotificationLinkTarget) => {
    await setNotificationRead(item.id);
    onRead?.();
    if (item.orderGroupId === null) return;
    const query =
      target.type === 'document' &&
      item.orderId &&
      item.targetSnapshot.documentNumber
        ? `?document=${item.targetSnapshot.documentNumber}`
        : '';
    onNavigate(`/order/${item.orderGroupId}${query}`);
  };

  return (
    <div className={styles.item}>
      <span className={`${styles.icon} ${isDocument ? '' : styles.orderIcon}`}>
        {isDocument ? <FileTextOutlined /> : <ShoppingCartOutlined />}
      </span>
      <div className={styles.content}>
        {link ? (
          <Button
            className={styles.title}
            type="link"
            title={link.label}
            onClick={() => void follow(link.target)}
          >
            {link.label}
          </Button>
        ) : (
          <Typography.Text className={styles.title}>
            Уведомление
          </Typography.Text>
        )}
        <Typography.Text className={styles.details} type="secondary">
          {getDetails(item)}
        </Typography.Text>
      </div>
      <div className={styles.meta}>
        <Typography.Text className={styles.time} type="secondary">
          {new Date(item.createdAt).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Typography.Text>
        <span className={styles.unread} aria-label="Новое уведомление" />
      </div>
    </div>
  );
};
