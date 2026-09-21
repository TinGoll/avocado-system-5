export type NotificationLinkTarget =
  | { type: 'order'; orderGroupId: number }
  | { type: 'document'; orderGroupId: number; documentId: string };

export type NotificationMessagePart =
  | { type: 'text'; text: string }
  | { type: 'link'; label: string; target: NotificationLinkTarget };

export type BusinessNotification = {
  id: string;
  ruleId: string | null;
  ruleRevision: number;
  orderGroupId: number | null;
  orderId: string | null;
  trigger: string;
  severity: 'info' | 'warning' | 'error';
  message: NotificationMessagePart[];
  targetSnapshot: {
    orderNumber: string | null;
    documentNumber: number | null;
    documentName: string | null;
  };
  createdAt: string;
  readAt: string | null;
  resolvedAt: string | null;
};

export type NotificationPage = {
  items: BusinessNotification[];
  meta: { nextCursor: string | null };
};
