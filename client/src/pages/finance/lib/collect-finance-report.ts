import {
  type FinanceCustomerStatement,
  type FinanceListParams,
  type FinanceStatementEntry,
  type FinanceTurnover,
  type FinanceTurnoverParams,
  type FinanceTurnoverRow,
  getFinanceCustomerStatement,
  getFinanceTurnover,
} from '@shared/api';

import type { FinanceReportDocument } from './finance-report-workbook';

type CollectOptions =
  | {
      type: 'statement';
      customerId: string;
      params: FinanceListParams;
    }
  | {
      type: 'turnover';
      params: FinanceTurnoverParams;
    };

export const collectFinanceReport = async (
  options: CollectOptions,
  signal: AbortSignal,
  onProgress: (rows: number) => void,
): Promise<FinanceReportDocument> => {
  let cursor: string | undefined;
  const items: Array<FinanceTurnoverRow | FinanceStatementEntry> = [];
  let lastPage: FinanceTurnover | FinanceCustomerStatement | undefined;
  do {
    lastPage =
      options.type === 'statement'
        ? await getFinanceCustomerStatement(
            options.customerId,
            { ...options.params, cursor, limit: 100 },
            signal,
          )
        : await getFinanceTurnover(
            { ...options.params, cursor, limit: 100 },
            signal,
          );
    items.push(
      ...(lastPage.items as Array<FinanceTurnoverRow | FinanceStatementEntry>),
    );
    onProgress(items.length);
    cursor = lastPage.meta.nextCursor ?? undefined;
  } while (cursor);

  if (options.type === 'statement') {
    const statement = lastPage as FinanceCustomerStatement;
    return {
      type: 'statement',
      customerId: options.customerId,
      customerName: statement.customer.companyName ?? statement.customer.name,
      dateFrom: options.params.dateFrom,
      dateTo: options.params.dateTo,
      items: items as FinanceStatementEntry[],
      totals: statement.totals,
    };
  }
  const turnover = lastPage as FinanceTurnover;
  return {
    type: 'turnover',
    params: options.params,
    items: items as FinanceTurnoverRow[],
    totals: turnover.totals,
  };
};
