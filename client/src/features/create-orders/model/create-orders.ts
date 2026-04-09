import type dayjs from 'dayjs';

import type { OrderGroup } from '@entities/order';

export type FieldType = {
  customerID: string;
  orderNumber: OrderGroup['orderNumber'];
  templateId: string;
  startedAt: dayjs.Dayjs;
};
