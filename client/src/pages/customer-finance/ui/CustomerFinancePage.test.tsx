import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';

import { createFinanceAllocationBatch } from '@shared/api';

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
vi.mock('@shared/api', () => ({
  createFinanceAllocationBatch: vi.fn(),
}));

const mockedFinance = vi.mocked(useCustomerFinancePage);
const mockedHistory = vi.mocked(useCustomerFinanceHistory);
const mockedCreateBatch = vi.mocked(createFinanceAllocationBatch);
const financeMutate = vi.fn();
const historyMutate = vi.fn();

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
      mutate: financeMutate,
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
      mutate: historyMutate,
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
            <Route
              path="/finance/allocations/:operationId"
              element={<div>Страница результата</div>}
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
    expect(container.textContent).toContain('Распределение №750.00 ₽');
  });

  it('filters history by operation categories', () => {
    renderPage();
    const paymentFilter = [...container.querySelectorAll('label')].find(
      (label) => label.textContent === 'Оплаты',
    );
    act(() => paymentFilter?.click());

    const lastCall = mockedHistory.mock.calls.at(-1);
    expect(lastCall?.[1]?.types).not.toContain('payment');
    expect(lastCall?.[1]?.types).toContain('allocation');
  });

  it('loads the next cursor page and can return back', () => {
    const historyState = mockedHistory('customer-1');
    mockedHistory.mockReturnValue({
      ...historyState,
      data: {
        ...historyState.data!,
        meta: { limit: 10, nextCursor: 'next-page' },
      },
    } as ReturnType<typeof useCustomerFinanceHistory>);
    renderPage();

    const next = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Далее',
    );
    act(() => next?.click());
    expect(mockedHistory.mock.calls.at(-1)?.[1]?.cursor).toBe('next-page');
    expect(container.textContent).toContain('Страница 2');

    const back = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Назад',
    );
    act(() => back?.click());
    expect(mockedHistory.mock.calls.at(-1)?.[1]?.cursor).toBeUndefined();
    expect(container.textContent).toContain('Страница 1');
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

  it('clears the draft and refreshes data after a conflict', async () => {
    mockedCreateBatch.mockRejectedValueOnce(
      Object.assign(new Error('Conflict'), {
        isAxiosError: true,
        response: { status: 409 },
      }),
    );
    renderPage();
    const auto = [...container.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Распределить автоматически'),
    )!;
    act(() => auto.click());
    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Сумма для заказа Заказ 42"]',
      )?.value,
    ).toBe('25.00');

    const save = [...container.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Сохранить распределение'),
    )!;
    act(() => save.click());
    const confirm = [...document.body.querySelectorAll('button')].find(
      (item) => item.textContent === 'Сохранить',
    )!;
    await act(async () => {
      confirm.click();
      confirm.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(financeMutate).toHaveBeenCalled();
    expect(historyMutate).toHaveBeenCalled();
    expect(container.textContent).toContain(
      'Данные обновлены — сформируйте распределение заново',
    );
    expect(
      container.querySelector<HTMLInputElement>(
        'input[aria-label="Сумма для заказа Заказ 42"]',
      )?.value,
    ).toBe('');
  });

  it('opens the permanent result after a successful save', async () => {
    mockedCreateBatch.mockResolvedValueOnce({ id: 77 } as never);
    renderPage();
    const auto = [...container.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Распределить автоматически'),
    )!;
    act(() => auto.click());
    expect(container.textContent).toContain('Погашение заказа в работе');

    const save = [...container.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Сохранить распределение'),
    )!;
    act(() => save.click());
    const confirm = [...document.body.querySelectorAll('button')].find(
      (item) => item.textContent === 'Сохранить',
    )!;
    await act(async () => {
      confirm.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedCreateBatch).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Страница результата');
  });

  it('warns before browser and client navigation with a non-empty draft', () => {
    const confirmNavigation = vi
      .spyOn(window, 'confirm')
      .mockReturnValue(false);
    renderPage();
    const auto = [...container.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Распределить автоматически'),
    )!;
    act(() => auto.click());

    const beforeUnload = new Event('beforeunload', { cancelable: true });
    act(() => window.dispatchEvent(beforeUnload));
    expect(beforeUnload.defaultPrevented).toBe(true);

    const backLink = container.querySelector<HTMLAnchorElement>(
      'a[href="/finance?tab=customers"]',
    )!;
    act(() => backLink.click());
    expect(confirmNavigation).toHaveBeenCalled();
    expect(container.textContent).toContain('Иван Петров');
    confirmNavigation.mockRestore();
  });
});
