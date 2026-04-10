import { css } from '@emotion/css';
import { Alert, Skeleton } from 'antd';
import { type FC, type ReactNode } from 'react';

import { type Color } from '@entities/color';
import { type FacadePanel } from '@entities/facade-panel';
import { type FacadeProfile } from '@entities/facade-profile';
import { type Material } from '@entities/material';
import { useLoadOrder } from '@entities/order';
import { type Patina } from '@entities/patina';
import { type Varnish } from '@entities/varnish';

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
  renderCreateMaterial?: (onCreated: (material: Material) => void) => ReactNode;
  renderCreateColor?: (onCreated: (color: Color) => void) => ReactNode;
  renderCreateFacadeProfile?: (
    onCreated: (profile: FacadeProfile) => void,
  ) => ReactNode;
  renderCreateFacadePanel?: (
    onCreated: (panel: FacadePanel) => void,
  ) => ReactNode;
  renderCreateVarnish?: (onCreated: (varnish: Varnish) => void) => ReactNode;
  renderCreatePatina?: (onCreated: (patina: Patina) => void) => ReactNode;
};

export const EditOrderFields: FC<Props> = ({
  orderID,
  renderCreateMaterial,
  renderCreateColor,
  renderCreateFacadeProfile,
  renderCreateFacadePanel,
  renderCreateVarnish,
  renderCreatePatina,
}) => {
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
      <MaterialField renderCreateAction={renderCreateMaterial} />
      <ColorField renderCreateAction={renderCreateColor} />
      <FacadeProfileField renderCreateAction={renderCreateFacadeProfile} />
      <FacadePanelField renderCreateAction={renderCreateFacadePanel} />
      <VarnishField renderCreateAction={renderCreateVarnish} />
      <PatinaField renderCreateAction={renderCreatePatina} />
    </div>
  );
};
