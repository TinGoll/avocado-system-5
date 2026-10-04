import { Workbook } from '@protobi/exceljs';

import { buildFinanceReportWorkbook } from './finance-report-workbook';

describe('finance report workbook', () => {
  it('writes every supplied page row, filters, totals, and cancellation marker', async () => {
    const workbook = buildFinanceReportWorkbook(
      new Workbook(),
      {
        type: 'turnover',
        params: {
          reportType: 'payments',
          dateFrom: '2026-09-01',
          dateTo: '2026-09-30',
          method: 'bank_transfer',
        },
        items: [
          {
            id: 'payment-1',
            kind: 'payment',
            businessDate: '2026-09-10',
            createdAt: '2026-09-10T09:00:00.000Z',
            customerId: 'customer-1',
            customerName: 'Альфа',
            method: 'bank_transfer',
            externalReference: '42',
            comment: null,
            status: 'cancelled',
            cancelled: false,
            amountMinor: 10_000,
            amount: '100.00',
            allocatedMinor: 0,
            allocated: '0.00',
            unallocatedMinor: 10_000,
            unallocated: '100.00',
          },
          {
            id: 'payment-1',
            kind: 'payment_cancellation',
            businessDate: '2026-09-20',
            createdAt: '2026-09-20T09:00:00.000Z',
            customerId: 'customer-1',
            customerName: 'Альфа',
            method: 'bank_transfer',
            externalReference: '42',
            comment: null,
            status: 'cancelled',
            cancelled: true,
            amountMinor: -10_000,
            amount: '-100.00',
            allocatedMinor: 0,
            allocated: '0.00',
            unallocatedMinor: -10_000,
            unallocated: '-100.00',
          },
        ],
        totals: {
          count: 2,
          amountMinor: 0,
          amount: '0.00',
          allocatedMinor: 0,
          allocated: '0.00',
          unallocatedMinor: 0,
          unallocated: '0.00',
          byMethod: [
            { method: 'bank_transfer', amountMinor: 0, amount: '0.00' },
          ],
        },
      },
      new Date('2026-09-27T10:00:00.000Z'),
    );
    const buffer = await workbook.xlsx.writeBuffer();
    const reopened = new Workbook();
    await reopened.xlsx.load(buffer);
    const sheet = reopened.getWorksheet('Отчёт')!;
    const values = sheet.getSheetValues().flat().join(' ');

    expect(values).toContain('method: bank_transfer');
    expect(values).toContain('2026-09-10');
    expect(values).toContain('2026-09-20');
    expect(values).toContain('Сторно');
    expect(values).toContain('Итого');
  });
});
