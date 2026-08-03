import { css } from '@emotion/css';
import type { FC } from 'react';

import { EditGroupFields } from '@features/edit-order-group';
import { EditOrderWidget } from '@widgets/edit-order';

const styles = {
  container: css`
    padding: 16px;
  `,
};

const OrderEditPage: FC = () => {
  return (
    <div className={styles.container}>
      <EditGroupFields />
      <EditOrderWidget />
    </div>
  );
};

export default OrderEditPage;
