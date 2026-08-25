import { css } from '@emotion/css';
import { type FC } from 'react';

import type { Order, OrderGroup } from '@entities/order';

const styles = {
  preview: css`
    box-sizing: border-box;
    width: min(210mm, 100%);
    min-height: 297mm;
    margin: 0 auto;
    padding: 10mm;
    overflow: auto;
    color: #111;
    background: #fff;
    box-shadow: 0 2px 16px rgb(0 0 0 / 25%);
  `,
  data: css`
    margin: 16px 0 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font: 12px/1.5 monospace;
  `,
  title: css`
    color: red;
  `,
};

type CustomerOrderPrintFormProps = {
  order: OrderGroup;
  documents: Order[];
};

export const CustomerOrderPrintForm: FC<CustomerOrderPrintFormProps> = ({
  order,
  documents,
}) => (
  <article className={`${styles.preview} order-print-document`}>
    <h3 className={styles.title}>Бланк для заказчика</h3>
    <pre className={styles.data}>
      {JSON.stringify({ order, documents }, null, 2)}
    </pre>
  </article>
);
