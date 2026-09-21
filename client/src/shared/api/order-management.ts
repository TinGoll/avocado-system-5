import { fetcher } from '@shared/lib/swr';

export type ManagementScope = 'group' | 'document';
export type CustomOrderStatus = {
  id: string;
  scope: ManagementScope;
  name: string;
  color: string;
  position: number;
  archivedAt: string | null;
};
export type OrderLifecycleStatus =
  | 'draft'
  | 'in_production'
  | 'completed'
  | 'cancelled';
export type OrderManagementSettings = {
  id: 1;
  timeZone: string;
  autoAddStatus: OrderLifecycleStatus | null;
  autoAddBoardId: string | null;
  autoAddStageId: string | null;
};
export type ManagementView = {
  id: number | string;
  orderGroupId?: number | null;
  dueDate: string | null;
  effectiveDueDate?: string | null;
  customStatusId: string | null;
  customStatus: CustomOrderStatus | null;
  customStatusIds: string[];
  customStatuses: CustomOrderStatus[];
  managementVersion: number;
  status?: 'draft' | 'in_production' | 'completed' | 'cancelled';
};
export type UpdateManagementDto = {
  expectedVersion: number;
  dueDate?: string | null;
  customStatusId?: string | null;
  customStatusIds?: string[];
  status?: 'draft' | 'in_production' | 'completed' | 'cancelled';
  reason?: string;
  confirmIncompleteProduction?: boolean;
};

export type OrderProductionDocument = {
  id: string;
  name: string | null;
  documentNumber: number;
  effectiveDueDate: string | null;
  progressPercent: number;
  cardId: string | null;
  stageId: string | null;
  stageName: string | null;
  stageKind: 'queue' | 'active' | 'done' | null;
  boardId: string | null;
  boardName: string | null;
};

export type OrderProductionSummary = {
  documents: OrderProductionDocument[];
  progressPercent: number | null;
  documentCount: number;
  trackedCount: number;
  productionComplete: boolean;
};

export type OrderManagementEvent = {
  id: string;
  orderGroupId: number | null;
  orderId: string | null;
  type: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  targetSnapshot: {
    orderNumber: string | null;
    documentNumber: number | null;
    documentName: string | null;
  };
  reason: string | null;
  occurredAt: string;
};

export const orderManagementKeys = {
  statuses: (scope: ManagementScope) =>
    `order-management/statuses?scope=${scope}`,
  settings: 'order-management/settings',
  group: (id: number) => `order-groups/${id}/management`,
  document: (id: string) => `orders/${id}/management`,
  groupView: (id: number) => `order-groups/${id}/with-order-ids`,
  documentView: (id: string) => `orders/${id}/with-items`,
  production: (id: number) => `order-groups/${id}/production`,
  history: (groupId: number, orderId?: string) =>
    `order-management/history?orderGroupId=${groupId}${orderId ? `&orderId=${orderId}` : ''}&offset=0&limit=50`,
};

export const getOrderManagementHistory = (
  groupId: number,
  offset: number,
  limit: number,
) =>
  fetcher<{
    items: OrderManagementEvent[];
    meta: { nextOffset: number | null };
  }>({
    url: `order-management/history?orderGroupId=${groupId}&offset=${offset}&limit=${limit}`,
  });

export const getCustomStatuses = (scope: ManagementScope) =>
  fetcher<{ items: CustomOrderStatus[]; meta: { count: number } }>({
    url: orderManagementKeys.statuses(scope),
  });
export const createCustomStatus = (
  data: Pick<CustomOrderStatus, 'scope' | 'name' | 'color'> & {
    position?: number;
  },
) =>
  fetcher<CustomOrderStatus, typeof data>({
    url: 'order-management/statuses',
    method: 'POST',
    data,
  });
export const updateCustomStatus = (
  id: string,
  data: Partial<Pick<CustomOrderStatus, 'name' | 'color' | 'position'>>,
) =>
  fetcher<CustomOrderStatus, typeof data>({
    url: `order-management/statuses/${id}`,
    method: 'PATCH',
    data,
  });
export const archiveCustomStatus = (id: string) =>
  fetcher<CustomOrderStatus>({
    url: `order-management/statuses/${id}/archive`,
    method: 'POST',
  });
export const deleteCustomStatus = (id: string) =>
  fetcher<{ id: string }>({
    url: `order-management/statuses/${id}`,
    method: 'DELETE',
  });
export const updateOrderManagementSettings = (
  data: Omit<OrderManagementSettings, 'id'>,
) =>
  fetcher<OrderManagementSettings, typeof data>({
    url: orderManagementKeys.settings,
    method: 'PATCH',
    data,
  });
export const updateManagement = (
  scope: ManagementScope,
  id: number | string,
  data: UpdateManagementDto,
) =>
  fetcher<ManagementView, UpdateManagementDto>({
    url:
      scope === 'group'
        ? orderManagementKeys.group(Number(id))
        : orderManagementKeys.document(String(id)),
    method: 'PATCH',
    data,
  });
