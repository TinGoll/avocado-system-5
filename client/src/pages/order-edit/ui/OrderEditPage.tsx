import {
  CheckOutlined,
  PlayCircleOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { css } from '@emotion/css';
import { App, Breadcrumb, Button, Tag } from 'antd';
import type { FC } from 'react';
import { Link, useNavigate } from 'react-router';

import {
  ORDER_STATUS,
  orderStatusColors,
  orderStatusLabels,
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
  actions: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  orderGroupPanel: css`
    border: 1px solid var(--app-devider-color);
    border-radius: 6px;
    margin-bottom: 8px;
  `,
  orderGroupToolbar: css`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    padding: 8px;
    border-bottom: 1px solid var(--app-devider-color);
    border-radius: 5px 5px 0 0;
    background: var(--app-body-2-background-color);
  `,
  orderGroupFields: css`
    padding: 8px 8px 0;
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
        <div className={styles.actions}>
          {currentGroup && (
            <Tag
              variant="outlined"
              color={orderStatusColors[currentGroup.status]}
            >
              {orderStatusLabels[currentGroup.status]}
            </Tag>
          )}
        </div>
      </div>
      <div className={styles.orderGroupPanel}>
        <div className={styles.orderGroupToolbar}>
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={() => navigate(`/order/${groupID}/print`)}
          >
            Печать
          </Button>
          {currentGroup?.status === ORDER_STATUS.DRAFT && (
            <Button
              size="small"
              icon={<PlayCircleOutlined />}
              loading={update.isMutating}
              onClick={startProduction}
            >
              В работу
            </Button>
          )}
          {currentGroup && currentGroup.status !== ORDER_STATUS.DRAFT && (
            <Button
              size="small"
              icon={<CheckOutlined />}
              onClick={() => navigate(`/order/${currentGroup.id}`)}
            >
              Завершить редактирование
            </Button>
          )}
        </div>
        <div className={styles.orderGroupFields}>
          <EditGroupFields />
        </div>
      </div>
      <EditOrderWidget />
    </div>
  );
};

export default OrderEditPage;
