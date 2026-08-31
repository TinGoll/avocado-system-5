import { Endpoints, useEntityById } from '@shared/lib/swr';

import { orderTabsStore } from '../model/orderTabs.store';

type Response = {
  items: { id: string; name?: string; documentNumber: number }[];
};

export const useLoadTabs = (groupID: number | null) => {
  return useEntityById<Response>({
    endpoint: Endpoints.ORDER_GROUPS,
    id: groupID,
    path: 'order-ids',
    transform: (data) => data,
    onSuccess: (data) => {
      const tabs = [...(data?.items ?? [])]
        .sort((first, second) => first.documentNumber - second.documentNumber)
        .map(({ id, name, documentNumber }) => ({
          key: id,
          label: name ?? `Документ ${documentNumber}`,
          documentNumber,
        }));

      orderTabsStore.getState().setTabs(tabs);
    },
  });
};
