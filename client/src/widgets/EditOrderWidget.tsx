import type { FC } from 'react';

import { AddOrderItemForm } from '@features/add-order-items';
import { EditOrderFields } from '@features/edit-order';
import { OrderTabs, orderTabsStore, Toolbar } from '@features/order-tabs';

export const EditOrderWidget: FC = () => {
  const { currentTabKey: orderID } = orderTabsStore();

  return (
    <div>
      <OrderTabs />
      <Toolbar />
      <EditOrderFields orderID={orderID} />
      <AddOrderItemForm />
    </div>
  );
};
