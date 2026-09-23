import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';

import {
  useCustomerLinkIssues,
  useFinanceAccruals,
  useFinanceCustomers,
  useFinancePayments,
  useFinanceSummary,
} from '../api/finance-data';

import { FinancePage } from './FinancePage';

vi.mock('@shared/api', () => ({
  getCustomerLinkIssues: vi.fn(),
  getFinanceAccruals: vi.fn(),
  getFinanceCustomer: vi.fn(),
  getFinanceCustomers: vi.fn(),
  getFinancePayment: vi.fn(),
  getFinancePayments: vi.fn(),
  getFinanceSummary: vi.fn(),
}));

vi.mock('../api/finance-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/finance-data')>();
  return {
    ...actual,
    useCustomerLinkIssues: vi.fn(),
    useFinanceAccruals: vi.fn(),
    useFinanceCustomers: vi.fn(),
    useFinancePayments: vi.fn(),
    useFinanceSummary: vi.fn(),
  };
});

const mockedSummary = vi.mocked(useFinanceSummary);
const mockedIssues = vi.mocked(useCustomerLinkIssues);
const mockedAccruals = vi.mocked(useFinanceAccruals);
const mockedPayments = vi.mocked(useFinancePayments);
const mockedCustomers = vi.mocked(useFinanceCustomers);

const pageState = {
  error: undefined,
  isLoading: false,
  loadingMore: false,
  nextCursor: null,
  loadMore: vi.fn(),
  retry: vi.fn(),
};

describe('FinancePage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  beforeEach(() => {
    mockedSummary.mockReturnValue({
      data: {
        accruedMinor: 10_000,
        accrued: '100.00',
        paidMinor: 4_000,
        paid: '40.00',
        balanceMinor: 6_000,
        balance: '60.00',
        debtMinor: 6_000,
        debt: '60.00',
        advanceMinor: 0,
        advance: '0.00',
        allocatedMinor: 3_000,
        allocated: '30.00',
        unallocatedMinor: 1_000,
        unallocated: '10.00',
        customerLinkIssuesCount: 1,
      },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useFinanceSummary>);
    mockedIssues.mockReturnValue({
      data: {
        items: [
          {
            id: 1,
            orderNumber: 'ORD-OLD',
            reason: 'missing_or_invalid_customer_id',
          },
        ],
        meta: { count: 1 },
      },
    } as unknown as ReturnType<typeof useCustomerLinkIssues>);
    mockedPayments.mockReturnValue({
      ...pageState,
      items: [
        {
          id: 'payment-1',
          customerId: 'customer-1',
          customerName: 'Очень длинное название заказчика',
          businessDate: '2026-09-23',
          method: 'bank_transfer',
          externalReference: null,
          comment: null,
          status: 'cancelled',
          version: 1,
          amountMinor: 4_000,
          amount: '40.00',
          allocatedMinor: 0,
          allocated: '0.00',
          unallocatedMinor: 4_000,
          unallocated: '40.00',
          allocationState: 'unallocated',
        },
      ],
    });
    mockedAccruals.mockReturnValue({
      ...pageState,
      items: [
        {
          id: 'accrual-1',
          customerId: 'customer-1',
          customerName: 'Заказчик',
          sourceType: 'order',
          orderGroupId: 42,
          orderNumber: 'ORD-42',
          title: 'ORD-42',
          status: 'active',
          version: 0,
          businessDate: '2026-09-23',
          amountMinor: 10_000,
          amount: '100.00',
          allocatedMinor: 4_000,
          allocated: '40.00',
          remainingMinor: 6_000,
          remaining: '60.00',
          state: 'partially_paid',
        },
      ],
    });
    mockedCustomers.mockReturnValue({
      data: { items: [], meta: { count: 0 } },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useFinanceCustomers>);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  const renderPage = (url = '/finance') =>
    act(() =>
      root.render(
        <MemoryRouter initialEntries={[url]}>
          <FinancePage />
        </MemoryRouter>,
      ),
    );

  it('renders summary, diagnostics, cancelled payment, and long values', () => {
    renderPage();
    expect(container.textContent).toContain('Начислено');
    expect(container.textContent).toContain('100.00');
    expect(container.textContent).toContain('ORD-OLD');
    expect(container.textContent).toContain('Очень длинное название заказчика');
    expect(container.textContent).toContain('Аннулировано');
  });

  it('renders accrual tab from URL and links to the order', () => {
    renderPage('/finance?tab=accruals&customerId=customer-1');
    const link = container.querySelector<HTMLAnchorElement>(
      'a[href="/order/42"]',
    );
    expect(link?.textContent).toBe('ORD-42');
    expect(mockedAccruals).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'customer-1' }),
    );
    expect(container.textContent).toContain('Частично оплачено');
  });

  it('shows loading and error states with retry', () => {
    mockedSummary.mockReturnValue({
      error: new Error('offline'),
      isLoading: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useFinanceSummary>);
    mockedPayments.mockReturnValue({
      ...pageState,
      items: [],
      isLoading: true,
    });
    renderPage();
    expect(container.textContent).toContain(
      'Не удалось загрузить финансовые данные',
    );
    expect(
      container.querySelector('[aria-label="Загрузка финансовых данных"]'),
    ).not.toBeNull();
  });
});
