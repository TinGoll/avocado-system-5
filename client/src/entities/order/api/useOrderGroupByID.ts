import { Endpoints, useEntityById } from '@shared/lib/swr';

import type { OrderGroup } from '../model/types';

type Props = {
  groupID: number | null;
  onSuccess?: (group: OrderGroup) => void;
  onError?: (error: Error) => void;
};

export const useOrderGroupByID = ({ groupID, onSuccess, onError }: Props) => {
  return useEntityById<OrderGroup>({
    endpoint: Endpoints.ORDER_GROUPS,
    id: groupID,
    onSuccess,
    onError,
  });
};
