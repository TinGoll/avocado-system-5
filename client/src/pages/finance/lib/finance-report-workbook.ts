import type { Workbook } from '@protobi/exceljs';

import type {
  FinanceCustomerStatement,
  FinanceStatementEntry,
  FinanceTurnover,
  FinanceTurnoverParams,
  FinanceTurnoverRow,
} from '@shared/api';

export type FinanceReportDocument =
  | {
      type: 'turnover';
      params: FinanceTurnoverParams;
      items: FinanceTurnoverRow[];
      totals: FinanceTurnover['totals'];
    }
  | {
      type: 'statement';
      customerId: string;
      customerName: string;
      dateFrom?: string;
      dateTo?: string;
      items: FinanceStatementEntry[];
      totals: FinanceCustomerStatement['totals'];
    };

const moneyFormat = '#,##0.00 [$₽-ru-RU]';

const rubles = (minor: number) => minor / 100;

const addMetadata = (
  workbook: Workbook,
  document: FinanceReportDocument,
  generatedAt: Date,
) => {
  const sheet = workbook.addWorksheet('Отчёт');
  const title =
    document.type === 'statement'
      ? `Акт взаиморасчётов: ${document.customerName}`
      : document.params.reportType === 'payments'
        ? 'Отчёт по оплатам'
        : 'Отчёт по начислениям';
  const dateFrom =
    document.type === 'statement'
      ? document.dateFrom
      : document.params.dateFrom;
  const dateTo =
    document.type === 'statement' ? document.dateTo : document.params.dateTo;
  sheet.addRow([title]);
  sheet.addRow([
    'Период',
    `${dateFrom ?? 'без ограничения'} — ${dateTo ?? 'без ограничения'}`,
  ]);
  sheet.addRow(['Сформирован', generatedAt.toLocaleString('ru-RU')]);
  if (document.type === 'turnover') {
    const filters = Object.entries(document.params)
      .filter(
        ([key, value]) =>
          key !== 'cursor' && value !== undefined && value !== '',
      )
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join('; ');
    sheet.addRow(['Фильтры', filters || 'нет']);
  } else {
    sheet.addRow(['Заказчик ID', document.customerId]);
  }
  sheet.addRow([]);
  return sheet;
};

export const buildFinanceReportWorkbook = (
  workbook: Workbook,
  document: FinanceReportDocument,
  generatedAt = new Date(),
) => {
  workbook.creator = 'Avocado';
  workbook.created = generatedAt;
  const sheet = addMetadata(workbook, document, generatedAt);

  if (document.type === 'statement') {
    sheet.addRow([
      'Дата',
      'Операция',
      'Описание',
      'Начислено',
      'Оплачено',
      'Изменение сальдо',
    ]);
    document.items.forEach((item) => {
      const row = sheet.addRow([
        item.businessDate,
        item.title,
        item.details ?? '',
        rubles(item.accrualMinor),
        rubles(item.paymentMinor),
        rubles(item.balanceChangeMinor),
      ]);
      [4, 5, 6].forEach((column) => (row.getCell(column).numFmt = moneyFormat));
    });
    sheet.addRow([]);
    [
      ['Сальдо на начало', document.totals.openingBalanceMinor],
      ['Начислено за период', document.totals.accruedMinor],
      ['Оплачено за период', document.totals.paidMinor],
      ['Сальдо на конец', document.totals.closingBalanceMinor],
      ['Нераспределённый аванс', document.totals.unallocatedAdvanceMinor],
    ].forEach(([label, value]) => {
      const row = sheet.addRow([label, rubles(value as number)]);
      row.getCell(2).numFmt = moneyFormat;
    });
  } else if (document.params.reportType === 'payments') {
    sheet.addRow([
      'Дата',
      'Заказчик',
      'Способ',
      'Сумма',
      'Распределено',
      'Не распределено',
      'Внешний номер',
      'Статус',
      'Отмена',
    ]);
    document.items.forEach((item) => {
      if (item.kind === 'accrual') return;
      const row = sheet.addRow([
        item.businessDate,
        item.customerName,
        item.method,
        rubles(item.amountMinor),
        rubles(item.allocatedMinor),
        rubles(item.unallocatedMinor),
        item.externalReference ?? '',
        item.status,
        item.cancelled ? 'Сторно' : '',
      ]);
      [4, 5, 6].forEach((column) => (row.getCell(column).numFmt = moneyFormat));
    });
    sheet.addRow([]);
    const totalRow = sheet.addRow([
      'Итого',
      '',
      '',
      rubles(document.totals.amountMinor),
    ]);
    totalRow.getCell(4).numFmt = moneyFormat;
    document.totals.byMethod?.forEach((total) => {
      const row = sheet.addRow([
        `Итого ${total.method}`,
        '',
        '',
        rubles(total.amountMinor),
      ]);
      row.getCell(4).numFmt = moneyFormat;
    });
  } else {
    sheet.addRow([
      'Дата',
      'Заказчик',
      'Источник',
      'Заказ / услуга',
      'Операция',
      'Первоначально',
      'Корректировки',
      'Итого',
      'Статус',
    ]);
    document.items.forEach((item) => {
      if (item.kind !== 'accrual') return;
      const row = sheet.addRow([
        item.businessDate,
        item.customerName,
        item.sourceType,
        item.orderNumber ?? item.title,
        item.entryKind,
        rubles(item.initialMinor),
        rubles(item.adjustmentsMinor),
        rubles(item.amountMinor),
        item.status,
      ]);
      [6, 7, 8].forEach((column) => (row.getCell(column).numFmt = moneyFormat));
    });
    sheet.addRow([]);
    const totalRow = sheet.addRow([
      'Итого',
      '',
      '',
      '',
      '',
      rubles(document.totals.initialMinor ?? 0),
      rubles(document.totals.adjustmentsMinor ?? 0),
      rubles(document.totals.amountMinor),
    ]);
    [6, 7, 8].forEach(
      (column) => (totalRow.getCell(column).numFmt = moneyFormat),
    );
  }

  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.columns.forEach((column) => {
    column.width = 20;
  });
  return workbook;
};

export const downloadFinanceReport = async (
  document: FinanceReportDocument,
) => {
  const { Workbook } = await import('@protobi/exceljs');
  const workbook = buildFinanceReportWorkbook(new Workbook(), document);
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(buffer)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );
  const link = window.document.createElement('a');
  link.href = url;
  link.download = `Финансовый отчёт ${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};
