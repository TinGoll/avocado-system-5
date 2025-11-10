import { useCurrentOrderGroupID } from '@shared/hooks/useCurrentOrderGroupID';

import { useOrderGroupByID } from '../api/useOrderGroupByID';

export const useCurrentOrderGroup = () => {
  const { groupID } = useCurrentOrderGroupID();
  return useOrderGroupByID({
    groupID,
  });
};
