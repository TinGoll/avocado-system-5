import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';

import { useFinanceAllocationResult } from '../api/finance-allocation-result';

import { FinanceAllocationResultPage } from './FinanceAllocationResultPage';

vi.mock('../api/finance-allocation-result', () => ({
  useFinanceAllocationResult: vi.fn(),
}));

const mockedResult = vi.mocked(useFinanceAllocationResult);

describe('FinanceAllocationResultPage', () => {
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
    mockedResult.mockReturnValue({
      data: {
        id: 7,
        number: 'Распределение №7 от 04.10.2026',
        customer: {
          id: 'customer-1',
          name: 'Заказчик',
          companyName: 'Компания',
        },
        createdAt: '2026-10-04T10:00:00.000Z',
        comment: 'Комментарий',
        employee: 'Менеджер',
        total: '50.00',
        balanceAfter: '10.00',
        orders: [
          {
            accrualId: 'accrual-1',
            orderGroupId: 42,
            orderNumber: 'З-42',
            allocated: '50.00',
            newDebt: '25.00',
          },
        ],
        paymentSources: [],
      },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useFinanceAllocationResult>);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  it('renders a permanent allocation result', () => {
    act(() =>
      root.render(
        <MemoryRouter initialEntries={['/finance/allocations/7']}>
          <Routes>
            <Route
              path="/finance/allocations/:operationId"
              element={<FinanceAllocationResultPage />}
            />
          </Routes>
        </MemoryRouter>,
      ),
    );

    expect(container.textContent).toContain('Распределение №7 от 04.10.2026');
    expect(container.textContent).toContain('Комментарий');
    expect(container.querySelector('a[href="/order/42"]')?.textContent).toBe(
      'З-42',
    );
  });
});
