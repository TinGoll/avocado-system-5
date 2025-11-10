import { css } from '@emotion/css';
import { Alert, Skeleton } from 'antd';
import { type FC } from 'react';

import { orderTabsStore } from '@entities/order-tabs';
import { useLoadOrder } from '@features/edit-order-group';

import {
  ColorField,
  FacadePanelField,
  FacadeProfileField,
  MaterialField,
  PatinaField,
  VarnishField,
} from './ui';

const styles = {
  container: css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
    gap: 0 16px;

    border: 1px solid var(--app-devider-color);
    border-top: none;
    padding: 8px;

    /* @media (min-width: 1656px) {
      grid-template-columns: repeat(3, 1fr);
    } */
  `,
  alert: css`
    margin-top: 8px;
  `,
};

export const EditOrderWidget: FC = () => {
  const { currentTabKey: orderID } = orderTabsStore();
  const { order, isLoading } = useLoadOrder(orderID);

  if (!isLoading && !order) {
    return (
      <Alert
        className={styles.alert}
        message="Этот заказ пустой"
        description="Ты можешь создать новый документ в панели заказа"
        type="info"
        showIcon
      />
    );
  }

  if (isLoading) {
    return <Skeleton active />;
  }

  return (
    <div className={styles.container}>
      <MaterialField />
      <ColorField />
      <FacadeProfileField />
      <FacadePanelField />
      <VarnishField />
      <PatinaField />
    </div>
  );
};
