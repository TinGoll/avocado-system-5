import type { OrderStatus } from '@shared/lib/swr';

export type {
  Order,
  OrderGroup,
  OrderCharacteristics,
  OrderItemCharacteristics,
  OrderItem,
  OrderStatus,
  Snapshot,
  OrderColor,
  OrderFacadePanel,
  OrderFacadeProfile,
  OrderMaterial,
  OrderPatina,
  OrderVarnish,
} from '@shared/lib/swr';
export { ORDER_STATUS } from '@shared/lib/swr';

export const orderStatusLabels: Record<OrderStatus, string> = {
  draft: 'Черновик',
  in_production: 'В производстве',
  completed: 'Завершён',
  cancelled: 'Отменён',
};

export const orderStatusColors: Record<OrderStatus, string> = {
  draft: 'default',
  in_production: 'processing',
  completed: 'success',
  cancelled: 'error',
};
