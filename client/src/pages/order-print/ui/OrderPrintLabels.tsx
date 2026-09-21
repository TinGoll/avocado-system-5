import { css } from '@emotion/css';
import type { FC } from 'react';

import type { OrderCustomStatus } from '@shared/lib/swr';

const styles = {
  labels: css`
    box-sizing: border-box;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end !important;
    gap: 3px;
    width: 100%;
    padding: 3px 6px;
    border: 1px solid #cecece;
    border-bottom: none;
    font-size: 10px;
    line-height: 1.2;
  `,
  label: css`
    padding: 1px 5px;
    border: 1px solid #777;
    border-radius: 8px;
    color: #333;
    font-weight: 600;
  `,
};

type OrderPrintLabelsProps = {
  labels: OrderCustomStatus[];
};

export const OrderPrintLabels: FC<OrderPrintLabelsProps> = ({ labels }) =>
  labels.length > 0 ? (
    <div className={styles.labels}>
      {labels.map((label) => (
        <span className={styles.label} key={label.id}>
          {label.name}
        </span>
      ))}
    </div>
  ) : null;
