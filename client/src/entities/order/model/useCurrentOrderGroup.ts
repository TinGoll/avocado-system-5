import { useCurrentOrderGroupID } from '@shared/lib';

import { useOrderGroupByID } from '../api/useOrderGroupByID';

export const useCurrentOrderGroup = () => {
  const { groupID } = useCurrentOrderGroupID();
  return useOrderGroupByID({
    groupID,
  });
};
