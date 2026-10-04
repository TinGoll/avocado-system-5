import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';

import {
  useCustomerFinanceHistory,
  useCustomerFinancePage,
} from '../api/customer-finance';

import { CustomerFinancePage } from './CustomerFinancePage';

vi.mock('../api/customer-finance', () => ({
  useCustomerFinancePage: vi.fn(),
  useCustomerFinanceHistory: vi.fn(),
}));
vi.mock('@features/record-payment', () => ({
  FinanceMutationModals: ({ action }: { action: unknown }) => (
    <div data-testid="payment-modal">{JSON.stringify(action)}</div>
  ),
}));

const mockedFinance = vi.mocked(useCustomerFinancePage);
const mockedHistory = vi.mocked(useCustomerFinanceHistory);

describe('CustomerFinancePage', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn(() => ({
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
    mockedFinance.mockReturnValue({
      data: {
        customer: {
          id: 'customer-1',
          name: 'Иван Петров',
          companyName: 'Авокадо',
          city: 'Москва',
        },
        unallocatedBalance: '25.00',
        revision: 'revision',
        availableSystemStatuses: ['draft', 'in_production'],
        orders: [
          {
            id: 42,
            name: 'Заказ 42',
            orderNumber: 'З-42',
            createdAt: '2026-10-03T10:00:00.000Z',
            systemStatus: 'in_production',
            closed: false,
            allocationAvailable: true,
            accrualId: 'accrual-1',
            accrualStatus: 'active',
            total: '100.00',
            paid: '50.00',
            debt: '50.00',
            missingToHalf: '0.00',
            financialStatus: 'prepaid',
          },
        ],
      },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useCustomerFinancePage>);
    mockedHistory.mockReturnValue({
      data: {
        customer: {
          id: 'customer-1',
          name: 'Иван Петров',
          companyName: 'Авокадо',
        },
        items: [
          {
            id: 'event-1',
            operationId: 7,
            createdAt: '2026-10-03T11:00:00.000Z',
            type: 'allocation',
            amount: '50.00',
            description: 'Распределение №7',
            comment: null,
            employee: null,
            details: [],
          },
        ],
        meta: { limit: 50, nextCursor: null },
      },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useCustomerFinanceHistory>);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  const renderPage = () =>
    act(() =>
      root.render(
        <MemoryRouter initialEntries={['/finance/customers/customer-1']}>
          <Routes>
            <Route
              path="/finance/customers/:customerId"
              element={<CustomerFinancePage />}
            />
          </Routes>
        </MemoryRouter>,
      ),
    );

  it('renders customer summary, orders and allocation history link', () => {
    renderPage();

    expect(container.textContent).toContain('Иван Петров');
    expect(container.textContent).toContain('Авокадо · Москва');
    expect(container.textContent).toContain('25.00');
    expect(container.querySelector('a[href="/order/42"]')?.textContent).toBe(
      'Заказ 42 · №З-42',
    );
    expect(
      container.querySelector('a[href="/finance/allocations/7"]')?.textContent,
    ).toBe('Распределение №7');
  });

  it('opens payment modal with the route customer preselected', () => {
    renderPage();
    const button = [...container.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Внести оплату'),
    );
    act(() => button?.click());

    expect(
      container.querySelector('[data-testid="payment-modal"]')?.textContent,
    ).toContain('"customerId":"customer-1"');
  });

  it('renders empty orders and history states', () => {
    const financeState = mockedFinance('customer-1');
    mockedFinance.mockReturnValue({
      ...financeState,
      data: { ...financeState?.data, orders: [] },
    } as ReturnType<typeof useCustomerFinancePage>);
    const historyState = mockedHistory('customer-1');
    mockedHistory.mockReturnValue({
      ...historyState,
      data: { ...historyState?.data, items: [] },
    } as ReturnType<typeof useCustomerFinanceHistory>);
    renderPage();

    expect(container.textContent).toContain('У заказчика пока нет заказов');
    expect(container.textContent).toContain('Финансовых операций пока нет');
  });
});
