import { PlayCircleOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import { App, Breadcrumb, Button } from 'antd';
import type { FC } from 'react';
import { Link, useNavigate } from 'react-router';

import {
  ORDER_STATUS,
  useOrderGroupMutations,
  useOrderStore,
} from '@entities/order';
import { EditGroupFields } from '@features/edit-order-group';
import { useCurrentOrderGroupID } from '@shared/lib';
import { EditOrderWidget } from '@widgets/edit-order';

const styles = {
  container: css`
    padding: 16px;
  `,
  breadcrumbs: css`
    margin: 0;
  `,
  topbar: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  `,
};

const OrderEditPage: FC = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { groupID } = useCurrentOrderGroupID();
  const { currentGroup, setCurrentGroup } = useOrderStore();
  const { update } = useOrderGroupMutations();

  const startProduction = async () => {
    if (!currentGroup || currentGroup.status !== ORDER_STATUS.DRAFT) return;

    try {
      const updatedGroup = await update.trigger(currentGroup.id, {
        status: ORDER_STATUS.IN_PRODUCTION,
      });
      setCurrentGroup(updatedGroup);
      message.success('Заказ передан в работу');
      navigate(`/order/${updatedGroup.id}`);
    } catch {
      message.error('Не удалось передать заказ в работу');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.topbar}>
        <Breadcrumb
          className={styles.breadcrumbs}
          items={[
            { title: <Link to="/">Заказы</Link> },
            { title: `Заказ №${groupID}` },
          ]}
        />
        {currentGroup?.status === ORDER_STATUS.DRAFT && (
          <Button
            icon={<PlayCircleOutlined />}
            loading={update.isMutating}
            onClick={startProduction}
            type="primary"
          >
            В работу
          </Button>
        )}
      </div>
      <EditGroupFields />
      <EditOrderWidget />
    </div>
  );
};

export default OrderEditPage;
