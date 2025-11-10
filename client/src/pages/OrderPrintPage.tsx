import { type FC } from 'react';

import { useCurrentOrderGroupID } from '@shared/hooks/useCurrentOrderGroupID';

const OrderPrintPage: FC = () => {
  const { groupID } = useCurrentOrderGroupID();
  return <div>OrderPrintPage - {groupID}</div>;
};

export default OrderPrintPage;
