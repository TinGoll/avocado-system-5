import { Endpoints, useEntityById } from '@shared/lib/swr';

type OrderDocument = {
  id: string;
  name?: string;
  totalPrice: number;
};

type OrderDocumentsResponse = {
  items: OrderDocument[];
};

export const useOrderDocuments = (groupID: number | null) =>
  useEntityById<OrderDocumentsResponse>({
    endpoint: Endpoints.ORDER_GROUPS,
    id: groupID,
    path: 'order-ids',
  });
