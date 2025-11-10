import type { FC } from 'react';

import { useOrderGroupByIDWithOrderIDs } from '@entities/order';
import { useCurrentOrderGroupID } from '@shared/hooks/useCurrentOrderGroupID';

const OrderPage: FC = () => {
  const { groupID } = useCurrentOrderGroupID();
  const { isLoading, data: orderGroup } =
    useOrderGroupByIDWithOrderIDs(groupID);
  // eslint-disable-next-line no-console
  console.log('orderGroup', orderGroup);

  if (isLoading) {
    return <div>Loading...</div>;
  }
  return <div>OrderPage - {orderGroup?.id}</div>;
};

export default OrderPage;
