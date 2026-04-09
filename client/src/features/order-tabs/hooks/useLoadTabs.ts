import { Endpoints, useEntityById } from '@shared/lib/swr';

import { orderTabsStore } from '../model/orderTabs.store';

type Response = {
  items: { id: string; name?: string }[];
};

export const useLoadTabs = (groupID: number | null) => {
  return useEntityById<Response>({
    endpoint: Endpoints.ORDER_GROUPS,
    id: groupID,
    path: 'order-ids',
    transform: (data) => data,
    onSuccess: (data) => {
      orderTabsStore.getState().setTabs(
        data?.items?.map(({ id, name }, index) => ({
          key: id,
          label: name ?? `Документ ${index + 1}`,
        })),
      );
    },
  });
};
