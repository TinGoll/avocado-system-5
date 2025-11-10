import { css } from '@emotion/css';
import type { FC } from 'react';

import { EditOrderGroupWidget, EditOrderWidget } from '@widgets/order';
import { OrderTabsWidget } from '@widgets/order-tabs';

const styles = {
  container: css`
    padding: 16px;
  `,
};

const OrderEditPage: FC = () => {
  return (
    <div className={styles.container}>
      <EditOrderGroupWidget />
      <OrderTabsWidget />
      <EditOrderWidget />
    </div>
  );
};

export default OrderEditPage;
