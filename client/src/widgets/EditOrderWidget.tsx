import type { FC } from 'react';

import { OrderTabs, orderTabsStore, Toolbar } from '@entities/order-tabs';
import { AddOrderItemForm } from '@features/add-order-items';
import { EditOrderFields } from '@features/edit-order';

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
