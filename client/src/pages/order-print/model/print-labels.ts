import type { OrderCustomStatus } from '@shared/lib/swr';

export const getOrderPrintLabels = (
  groupLabels: OrderCustomStatus[] = [],
  documentLabels: OrderCustomStatus[] = [],
): OrderCustomStatus[] => [
  ...new Map(
    [...groupLabels, ...documentLabels].map((label) => [label.id, label]),
  ).values(),
];
