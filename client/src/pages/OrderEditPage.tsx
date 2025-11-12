import { css } from '@emotion/css';
import type { FC } from 'react';

import { EditOrderGroupWidget } from '@widgets/EditOrderGroupWidget';
import { EditOrderWidget } from '@widgets/EditOrderWidget';

const styles = {
  container: css`
    padding: 16px;
  `,
};

const OrderEditPage: FC = () => {
  return (
    <div className={styles.container}>
      <EditOrderGroupWidget />
      <EditOrderWidget />
    </div>
  );
};

export default OrderEditPage;
