import { type FC } from 'react';

import { useCurrentOrderGroupID } from '@shared/lib';

const OrderPrintPage: FC = () => {
  const { groupID } = useCurrentOrderGroupID();
  return <div>OrderPrintPage - {groupID}</div>;
};

export default OrderPrintPage;
