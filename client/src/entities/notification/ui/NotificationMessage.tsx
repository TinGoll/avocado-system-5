import { Button, Typography } from 'antd';
import type { FC } from 'react';

import { setNotificationRead } from '../api/notification-api';
import type { BusinessNotification } from '../model/notification';

type Props = {
  item: BusinessNotification;
  onNavigate: (path: string) => void;
  onRead?: () => void;
};

export const NotificationMessage: FC<Props> = ({
  item,
  onNavigate,
  onRead,
}) => {
  const follow = async (kind: 'order' | 'document') => {
    await setNotificationRead(item.id);
    onRead?.();
    if (item.orderGroupId === null) return;
    const query =
      kind === 'document' && item.orderId && item.targetSnapshot.documentNumber
        ? `?document=${item.targetSnapshot.documentNumber}`
        : '';
    onNavigate(`/order/${item.orderGroupId}${query}`);
  };

  return (
    <Typography.Text>
      {item.message.map((part) =>
        part.type === 'text' ? (
          <span key={`text:${part.text}`}>{part.text}</span>
        ) : item.orderGroupId === null ? (
          <Typography.Text key={`deleted:${part.label}`} disabled>
            Объект удалён
          </Typography.Text>
        ) : (
          <Button
            key={`link:${part.target.type}:${part.label}`}
            size="small"
            type="link"
            onClick={() => void follow(part.target.type)}
          >
            {part.target.type === 'document' && !item.orderId
              ? `${part.label} (открыть заказ)`
              : part.label}
          </Button>
        ),
      )}
    </Typography.Text>
  );
};
