import { css } from '@emotion/css';
import { Breadcrumb } from 'antd';
import type { FC } from 'react';
import { Link } from 'react-router';

import { EditGroupFields } from '@features/edit-order-group';
import { useCurrentOrderGroupID } from '@shared/lib';
import { EditOrderWidget } from '@widgets/edit-order';

const styles = {
  container: css`
    padding: 16px;
  `,
  breadcrumbs: css`
    margin-bottom: 16px;
  `,
};

const OrderEditPage: FC = () => {
  const { groupID } = useCurrentOrderGroupID();

  return (
    <div className={styles.container}>
      <Breadcrumb
        className={styles.breadcrumbs}
        items={[
          { title: <Link to="/">Заказы</Link> },
          { title: `Заказ №${groupID}` },
        ]}
      />
      <EditGroupFields />
      <EditOrderWidget />
    </div>
  );
};

export default OrderEditPage;
