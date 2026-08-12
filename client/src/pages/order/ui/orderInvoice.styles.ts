import { css } from '@emotion/css';

export const invoiceStyles = {
  sheet: css`
    color: #1f2937;
    background: #ffffff;
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
    overflow: hidden;
  `,
  header: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px 12px;
    border-bottom: 1px solid #1f2937;
  `,
  eyebrow: css`
    margin: 0 0 2px;
    color: #6b7280;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  `,
  title: css`
    margin: 0;
    color: #111827;
    font-size: clamp(19px, 2.5vw, 24px);
    line-height: 1.2;
  `,
  documentName: css`
    margin-top: 3px;
    color: #4b5563;
    font-size: 12px;
  `,
  status: css`
    flex: 0 0 auto;
    margin: 0;
    font-size: 11px;
    line-height: 18px;
  `,
  meta: css`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border-bottom: 1px solid #d1d5db;

    @media (max-width: 600px) {
      grid-template-columns: 1fr;
    }
  `,
  metaItem: css`
    min-width: 0;
    padding: 8px 16px;
    border-right: 1px solid #e5e7eb;

    &:last-child {
      border-right: 0;
    }

    @media (max-width: 600px) {
      padding: 7px 12px;
      border-right: 0;
      border-bottom: 1px solid #e5e7eb;

      &:last-child {
        border-bottom: 0;
      }
    }
  `,
  metaLabel: css`
    display: block;
    margin-bottom: 2px;
    color: #6b7280;
    font-size: 10px;
  `,
  metaValue: css`
    display: block;
    color: #111827;
    font-size: 13px;
    font-weight: 600;
  `,
  characteristics: css`
    display: grid;
    grid-template-columns: repeat(3, minmax(160px, 1fr));
    gap: 6px 16px;
    padding: 9px 16px;
    background: #f9fafb;
    border-bottom: 1px solid #d1d5db;

    @media (max-width: 600px) {
      grid-template-columns: repeat(2, minmax(120px, 1fr));
      padding: 8px 12px;
    }

    @media (max-width: 480px) {
      grid-template-columns: 1fr;
    }
  `,
  characteristic: css`
    min-width: 0;
  `,
  tableWrap: css`
    overflow-x: auto;
  `,
  table: css`
    width: 100%;
    min-width: 780px;
    border-collapse: collapse;
    font-size: 12px;

    th {
      padding: 6px 7px;
      color: #374151;
      background: #f3f4f6;
      border-bottom: 1px solid #9ca3af;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-align: left;
      text-transform: uppercase;
      white-space: nowrap;
    }

    td {
      padding: 7px;
      color: #1f2937;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }

    th:first-child,
    td:first-child {
      padding-left: 16px;
    }

    th:last-child,
    td:last-child {
      padding-right: 16px;
    }

    tbody tr:last-child td {
      border-bottom: 0;
    }
  `,
  numeric: css`
    text-align: right !important;
    white-space: nowrap;
  `,
  product: css`
    color: #111827;
    font-weight: 600;
  `,
  productGroup: css`
    margin-top: 1px;
    color: #6b7280;
    font-size: 10px;
  `,
  comment: css`
    max-width: 200px;
    color: #4b5563;
  `,
  empty: css`
    padding: 28px 16px;
    color: #6b7280;
    text-align: center;
  `,
  total: css`
    display: flex;
    justify-content: flex-end;
    padding: 10px 16px 12px;
    border-top: 1px solid #1f2937;
    font-size: 12px;
  `,
  totalBox: css`
    display: grid;
    grid-template-columns: auto minmax(130px, auto);
    gap: 3px 18px;
    min-width: 240px;
  `,
  totalLabel: css`
    color: #6b7280;
  `,
  totalValue: css`
    color: #111827;
    font-weight: 600;
    text-align: right;
  `,
  grandTotalLabel: css`
    padding-top: 5px;
    color: #111827;
    border-top: 1px solid #d1d5db;
    font-size: 13px;
    font-weight: 700;
  `,
  grandTotalValue: css`
    padding-top: 5px;
    color: #111827;
    border-top: 1px solid #d1d5db;
    font-size: 16px;
    font-weight: 800;
    text-align: right;
    white-space: nowrap;
  `,
};
