import { css } from '@emotion/css';
import { type FC } from 'react';

import type { OrderGroup } from '@entities/order';

import type { ProductionOrderDocument } from '../model/production-order';

const unitLabels: Record<string, string> = {
  per_item: 'шт.',
  area: 'м²',
  volume: 'м³',
};

const quantityFormatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 6,
});
const moneyFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

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
  title: css`
    margin: 0 0 16px;
    text-align: center;
  `,
  details: css`
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 4px 12px;
    margin-bottom: 20px;
  `,
  table: css`
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;

    th,
    td {
      padding: 6px;
      border: 1px solid #333;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: #f2f2f2;
    }

    td:not(:first-child),
    th:not(:first-child) {
      white-space: nowrap;
      text-align: right;
    }

    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    thead {
      display: table-header-group;
    }
  `,
};

type ProductionOrderPrintFormProps = {
  group: OrderGroup;
  document: ProductionOrderDocument;
};

export const ProductionOrderPrintForm: FC<ProductionOrderPrintFormProps> = ({
  group,
  document,
}) => (
  <article className={`${styles.preview} order-print-document`}>
    <h2 className={styles.title}>Производственный бланк-наряд</h2>
    <dl className={styles.details}>
      <dt>Заказчик:</dt>
      <dd>{group.customer.name}</dd>
      <dt>Группа заказов:</dt>
      <dd>{group.orderNumber}</dd>
      <dt>Работа:</dt>
      <dd>{document.operationName}</dd>
    </dl>
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Производственная строка</th>
          <th>Кол-во изделий</th>
          <th>Расчётное кол-во</th>
          <th>Ед.</th>
          <th>Стоимость, ₽</th>
        </tr>
      </thead>
      <tbody>
        {document.rows.map((row) => (
          <tr key={row.key}>
            <td>{row.renderedName}</td>
            <td>{quantityFormatter.format(row.sourceQuantity)}</td>
            <td>{quantityFormatter.format(row.calculatedQuantity)}</td>
            <td>{unitLabels[row.unit] ?? row.unit}</td>
            <td>{moneyFormatter.format(row.totalCost)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </article>
);
