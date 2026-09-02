import { css } from '@emotion/css';
import dayjs from 'dayjs';
import { Fragment, type FC } from 'react';

import type { OrderGroup } from '@entities/order';
import { MarkdownPreview } from '@shared/ui/markdown';

import { formatOrderPrintNumber } from '../model/order-print-number';
import type { ProductionOrderDocument } from '../model/production-order';

const unitLabels: Record<string, string> = {
  per_item: 'шт.',
  linear_meter: 'м',
  area: 'м²',
  volume: 'м³',
};

const quantityFormatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 2,
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
    padding: 7mm;
    overflow: auto;
    color: #111;
    background: #fff;
    box-shadow: 0 2px 16px rgb(0 0 0 / 25%);

    @media print {
      &:not(:first-child) {
        break-before: page;
        page-break-before: always;
      }
    }
  `,
  title: css`
    margin: 0 0 10px;
    text-align: center;
  `,
  orderHeader: css`
    --order-border: #cecece;
    display: flex;
    border: 1px solid var(--order-border);
    border-bottom: none;

    > div:not(:last-of-type) {
      border-right: 1px solid var(--order-border);
    }

    > div {
      padding: 1px 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
    }

    & .orderNumber,
    .customer {
      flex: 1;
    }

    & .orderID,
    .customer {
      font-weight: 700;
    }

    & .pageNumber {
      min-width: 44px;
    }
  `,
  documentHeader: css`
    --order-border: #cecece;
    display: grid;
    grid-template-columns: 124px 1fr 124px 1fr;
    grid-auto-rows: minmax(24px, auto);
    border: 1px solid var(--order-border);
    border-bottom: none;
    background: var(--order-border);
    gap: 1px;

    & > div {
      background: white;
      padding: 1px 8px;
      display: flex;
      align-items: center;
    }

    & .label {
      justify-content: flex-end;
      text-align: right;
      font-weight: 500;
      background-color: #f0f0f0;
    }

    & .footer {
      grid-column: 1 / -1;

      & .wmde-markdown > p {
        margin: 6px 0;
      }
    }
  `,
  table: css`
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;

    th,
    td {
      padding: 4px;
      border: 1px solid #cecece;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: #f2f2f2;
    }

    td:not(:nth-child(2)),
    th:not(:nth-child(2)) {
      white-space: nowrap;
    }

    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    thead {
      display: table-header-group;
    }
  `,
  total: css`
    padding: 3px 40px;
    border: 1px solid #cecece;
    border-top: none;
    font-size: 13px;
    font-weight: 700;
  `,
};

type ProductionOrderPrintFormProps = {
  group: OrderGroup;
  document: ProductionOrderDocument;
  documentCount: number;
};

const characteristicLabels = [
  ['profile', 'Модель фасада'],
  ['material', 'Материал'],
  ['color', 'Цвет'],
  ['patina', 'Патина'],
  ['varnish', 'Лак'],
  ['panel', 'Филёнка'],
] as const;

export const ProductionOrderPrintForm: FC<ProductionOrderPrintFormProps> = ({
  group,
  document,
  documentCount,
}) => (
  <div>
    {document.sheets.map(({ order, rows }) => {
      const total = rows.reduce((sum, row) => sum + row.totalCost, 0);

      return (
        <article
          className={`${styles.preview} order-print-document`}
          key={order.id}
        >
          <h2 className={styles.title}>
            Бланк-наряд: {document.operationName}
          </h2>
          <div className={styles.orderHeader}>
            <div className="orderID">
              {formatOrderPrintNumber(
                group.id,
                order.documentNumber,
                documentCount,
              )}
            </div>
            <div className="orderNumber">{group.orderNumber}</div>
            <div className="customer">{group.customer?.name}</div>
            <div className="orderData">
              {dayjs(group.startedAt).format('DD.MM.YYYY')}
            </div>
            {/* <div className="pageNumber">
              {documentIndex + 1}/{documentCount}
            </div> */}
          </div>
          <div className={styles.documentHeader}>
            {characteristicLabels.map(([key, label]) =>
              order.characteristics[key] !== undefined ? (
                <Fragment key={key}>
                  <div className="label">{label}:</div>
                  <div className="value">
                    {order.characteristics[key]?.name ?? '-'}
                  </div>
                </Fragment>
              ) : null,
            )}
            {(order.characteristics.drilling !== undefined ||
              order.characteristics.thermalSeam !== undefined) && (
              <>
                <div className="label">Дополнительно:</div>
                <div className="value">
                  {order.characteristics.drilling !== undefined &&
                    `Присадка: ${order.characteristics.drilling};`}
                  {order.characteristics.drilling !== undefined &&
                    order.characteristics.thermalSeam !== undefined &&
                    ' '}
                  {order.characteristics.thermalSeam !== undefined &&
                    `Термошов: ${order.characteristics.thermalSeam};`}
                </div>
              </>
            )}
            <div className="footer">
              <MarkdownPreview
                emptyText=""
                value={[group.comment, order.comment]
                  .filter(Boolean)
                  .join('\n\n')}
              />
            </div>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>№</th>
                <th>Название</th>
                <th>Высота</th>
                <th>Ширина</th>
                <th>Толщина</th>
                <th>Кол-во, ед.</th>
                <th>Стоимость, ₽</th>
                <th>Сумма, ₽</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.key}>
                  <td>{index + 1}</td>
                  <td>{row.renderedName}</td>
                  <td>{row.height ?? '-'}</td>
                  <td>{row.width ?? '-'}</td>
                  <td>{row.thickness ?? '-'}</td>
                  <td>
                    {quantityFormatter.format(row.calculatedQuantity)}{' '}
                    {unitLabels[row.unit] ?? row.unit}
                  </td>
                  <td>{moneyFormatter.format(row.costPerUnit)}</td>
                  <td>{moneyFormatter.format(row.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.total}>
            Итого: {moneyFormatter.format(total)} ₽
          </div>
        </article>
      );
    })}
  </div>
);
