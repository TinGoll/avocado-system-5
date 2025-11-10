import { type FC } from 'react';

import { OrderTabs, Toolbar } from '@entities/order-tabs';
import { useCurrentOrderGroupID } from '@shared/hooks/useCurrentOrderGroupID';

export const OrderTabsWidget: FC = () => {
  const { groupID } = useCurrentOrderGroupID();

  return (
    <div>
      <OrderTabs groupID={groupID} />
      <Toolbar />
    </div>
  );
};
