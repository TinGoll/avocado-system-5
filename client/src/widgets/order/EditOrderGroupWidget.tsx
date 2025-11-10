import type { FC } from 'react';

import { EditOrderGroupForm } from '@features/edit-order-group';
import { useCurrentOrderGroupID } from '@shared/hooks/useCurrentOrderGroupID';

export const EditOrderGroupWidget: FC = () => {
  const { groupID } = useCurrentOrderGroupID();

  return <EditOrderGroupForm groupID={groupID} />;
};
