import { useOrderGroupByID } from '../api/useOrderGroupByID';

import { useCurrentOrderGroupID } from './useCurrentOrderGroupID';

export const useCurrentOrderGroup = () => {
  const { orderID } = useCurrentOrderGroupID();
  return useOrderGroupByID(orderID);
};
