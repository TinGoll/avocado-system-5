import { getFinanceTurnover } from '@shared/api';

import { collectFinanceReport } from './collect-finance-report';

vi.mock('@shared/api', () => ({
  getFinanceCustomerStatement: vi.fn(),
  getFinanceTurnover: vi.fn(),
}));

describe('collectFinanceReport', () => {
  it('fetches every cursor page before creating the export document', async () => {
    const totals = { count: 2, amountMinor: 300, amount: '3.00' };
    vi.mocked(getFinanceTurnover)
      .mockResolvedValueOnce({
        reportType: 'payments',
        items: [{ id: '1' } as never],
        totals,
        meta: { nextCursor: 'next' },
      })
      .mockResolvedValueOnce({
        reportType: 'payments',
        items: [{ id: '2' } as never],
        totals,
        meta: { nextCursor: null },
      });
    const progress = vi.fn();

    const result = await collectFinanceReport(
      { type: 'turnover', params: { reportType: 'payments' } },
      new AbortController().signal,
      progress,
    );

    expect(result.items.map((item) => item.id)).toEqual(['1', '2']);
    expect(getFinanceTurnover).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ cursor: 'next', limit: 100 }),
      expect.any(AbortSignal),
    );
    expect(progress).toHaveBeenLastCalledWith(2);
  });
});
