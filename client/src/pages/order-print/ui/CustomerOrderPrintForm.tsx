import { css } from '@emotion/css';
import dayjs from 'dayjs';
import { type FC } from 'react';

import type { Order, OrderGroup } from '@entities/order';

import {
  buildCustomerOrderRows,
  buildCustomerOrderTotals,
} from '../model/customer-order';

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
      justify-content: flex-start;
      text-align: center;
      font-weight: 500;
    }
  `,
  elementsTable: css`
    & .elementsTable {
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

      td:not(:first-child),
      th:not(:first-child) {
        white-space: nowrap;
        text-align: left;
      }

      tr {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      thead {
        display: table-header-group;
      }
    }
  `,
  totals: css`
    border: 1px solid #cecece;
    font-size: 13px;

    & .totalRow {
      padding: 3px 40px;
    }

    & .totalRow + .totalRow {
      border-top: 1px solid #cecece;
    }

    & .grandTotal {
      font-weight: 700;
    }
  `,
};

type CustomerOrderPrintFormProps = {
  order: OrderGroup;
  document: Order;
  documentCount: number;
  documentIndex: number;
  showPrices?: boolean;
};

export const CustomerOrderPrintForm: FC<CustomerOrderPrintFormProps> = ({
  order,
  document,
  documentCount,
  documentIndex,
  showPrices = true,
}) => {
  const rows = buildCustomerOrderRows(document);
  const totals = showPrices ? buildCustomerOrderTotals(document) : null;

  return (
    <article className={`${styles.preview} order-print-document`}>
      <div className={styles.orderHeader}>
        <div className="orderID">
          {`№ ${order.id}${documentCount > 1 ? '/' + document.documentNumber + ' (' + documentCount + ')' : order.orderCount}`}
        </div>
        <div className="orderNumber">{order.orderNumber}</div>
        <div className="customer">{order.customer?.name}</div>
        <div className="orderData">
          {dayjs(order.startedAt).format('DD.MM.YYYY')}
        </div>
        <div className="pageNumber">
          {documentIndex + 1}/{documentCount}
        </div>
      </div>
      <div className={styles.documentHeader}>
        {document.characteristics.profile !== undefined && (
          <>
            <div className="label">Модель фасада:</div>
            <div className="value">
              {document.characteristics.profile.name ?? '-'}
            </div>
          </>
        )}
        {document.characteristics.material !== undefined && (
          <>
            <div className="label">Материал:</div>
            <div className="value">
              {document.characteristics.material.name ?? '-'}
            </div>
          </>
        )}
        {document.characteristics.color !== undefined && (
          <>
            <div className="label">Цвет:</div>
            <div className="value">
              {document.characteristics.color.name ?? '-'}
            </div>
          </>
        )}
        {document.characteristics.patina !== undefined && (
          <>
            <div className="label">Патина:</div>
            <div className="value">
              {document.characteristics.patina.name ?? '-'}
            </div>
          </>
        )}
        {document.characteristics.varnish !== undefined && (
          <>
            <div className="label">Лак:</div>
            <div className="value">
              {document.characteristics.varnish.name ?? '-'}
            </div>
          </>
        )}
        {document.characteristics.panel !== undefined && (
          <>
            <div className="label">Филёнка:</div>
            <div className="value">
              {document.characteristics.panel.name ?? '-'}
            </div>
          </>
        )}
        {(document.characteristics.drilling !== undefined ||
          document.characteristics.thermalSeam !== undefined) && (
          <>
            <div className="label">Дополнительно:</div>
            <div className="value">
              {document.characteristics.drilling !== undefined &&
                `Присадка: ${document.characteristics.drilling};`}
              {document.characteristics.drilling !== undefined &&
                document.characteristics.thermalSeam !== undefined &&
                ' '}
              {document.characteristics.thermalSeam !== undefined &&
                `Термошов: ${document.characteristics.thermalSeam};`}
            </div>
          </>
        )}

        <div className="footer">
          {order?.comment ?? ''}
          {document?.comment ? '\n' + document?.comment : ''}
        </div>
      </div>
      <div className={styles.elementsTable}>
        <table className="elementsTable">
          <thead>
            <tr>
              <th>№</th>
              <th>Название</th>
              <th>Кол-во</th>
              {showPrices && <th>Цена, ₽</th>}
              {showPrices && <th>Сумма, ₽</th>}
              <th>Комментарий</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.key}>
                <td>{index + 1}</td>
                <td>{row.dimensions}</td>
                <td>
                  {row.calculatedQuantity.toLocaleString('ru-RU', {
                    maximumFractionDigits: 3,
                  })}{' '}
                  {row.unit}
                </td>
                {showPrices && <td>{row.unitPrice.toLocaleString('ru-RU')}</td>}
                {showPrices && (
                  <td>{row.totalPrice.toLocaleString('ru-RU')}</td>
                )}
                <td>{row.comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totals && (
        <div className={styles.totals}>
          {totals.groups.map(({ group, amount }) => (
            <div className="totalRow" key={group}>
              {group}: {amount.toLocaleString('ru-RU')} ₽
            </div>
          ))}
          <div className="totalRow grandTotal">
            Итого: {totals.total.toLocaleString('ru-RU')} ₽
          </div>
        </div>
      )}
    </article>
  );
};
