import { css } from '@emotion/css';
import { Alert, Skeleton } from 'antd';
import { type FC } from 'react';

import { useLoadOrder } from '@entities/order';

import {
  MaterialField,
  ColorField,
  FacadeProfileField,
  FacadePanelField,
  VarnishField,
  PatinaField,
} from './ui';

const styles = {
  fields: css`
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

type Props = {
  orderID?: string;
};

export const EditOrderFields: FC<Props> = ({ orderID }) => {
  const { order, isLoading } = useLoadOrder(orderID);

  const isEmpty = !isLoading && !order;

  if (isEmpty) {
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
    <div className={styles.fields}>
      <MaterialField />
      <ColorField />
      <FacadeProfileField />
      <FacadePanelField />
      <VarnishField />
      <PatinaField />
    </div>
  );
};
