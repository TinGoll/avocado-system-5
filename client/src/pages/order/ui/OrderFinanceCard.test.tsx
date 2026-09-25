import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { useOrderFinance } from '@entities/finance';
import type { OrderGroup } from '@entities/order';

import { OrderFinanceCard } from './OrderFinanceCard';

vi.mock('@entities/finance', () => ({
  formatFinanceMoney: (value?: string) => `${value ?? '0.00'} ₽`,
  useOrderFinance: vi.fn(),
}));
vi.mock('@features/record-payment', () => ({
  FinanceMutationModals: ({ action }: { action: { type: string } | null }) => (
    <div
      data-action={action?.type ?? ''}
      data-payload={JSON.stringify(action)}
    />
  ),
}));

const mockedFinance = vi.mocked(useOrderFinance);
const group: OrderGroup = {
  id: 42,
  orderNumber: 'ORD-42',
  customerId: 'customer-1',
  customer: { id: 'customer-1', name: 'Заказчик' },
  status: 'in_production',
  orderCount: 1,
  orders: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};
const financeData = {
  orderGroup: { id: 42, orderNumber: 'ORD-42', customerId: 'customer-1' },
  orderTotalMinor: 12_000,
  orderTotal: '120.00',
  accruedMinor: 10_000,
  accrued: '100.00',
  allocatedMinor: 4_000,
  allocated: '40.00',
  remainingMinor: 6_000,
  remaining: '60.00',
  syncDifferenceMinor: 2_000,
  syncDifference: '20.00',
  customerUnallocatedAdvanceMinor: 1_500,
  customerUnallocatedAdvance: '15.00',
  accrualId: 'accrual-1',
  accrualStatus: 'active' as const,
  accrualVersion: 3,
};

describe('OrderFinanceCard', () => {
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
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    mockedFinance.mockReturnValue({
      data: financeData,
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useOrderFinance>);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  const renderCard = (value: OrderGroup = group) =>
    act(() => root.render(<OrderFinanceCard group={value} />));

  it('shows totals, difference, customer advance and payment action', () => {
    renderCard();
    expect(container.textContent).toContain('Рассчитано по документам120.00 ₽');
    expect(container.textContent).toContain('Разница с текущей ценой20.00 ₽');
    expect(container.textContent).toContain(
      'Нераспределённый аванс заказчика15.00 ₽',
    );

    act(() => {
      Array.from(container.querySelectorAll('button'))
        .find((button) => button.textContent === 'Добавить оплату')
        ?.click();
    });
    expect(
      container.querySelector('[data-action]')?.getAttribute('data-action'),
    ).toBe('payment');
    expect(
      container.querySelector('[data-payload]')?.getAttribute('data-payload'),
    ).toContain('"accrualId":"accrual-1","amount":"60.00"');
  });

  it('explains missing customer and disables financial actions', () => {
    mockedFinance.mockReturnValue({
      data: {
        ...financeData,
        orderGroup: { ...financeData.orderGroup, customerId: null },
        accrualId: null,
        accrualStatus: null,
        accrualVersion: null,
      },
      isLoading: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useOrderFinance>);
    renderCard({ ...group, customerId: null, customer: {} });
    expect(container.textContent).toContain('У заказа не выбран заказчик');
    expect(container.textContent).not.toContain('Добавить оплату');
  });

  it('offers accrual creation when it is absent', () => {
    mockedFinance.mockReturnValue({
      data: {
        ...financeData,
        accrualId: null,
        accrualStatus: null,
        accrualVersion: null,
      },
      isLoading: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useOrderFinance>);
    renderCard();
    expect(container.textContent).toContain('Начисление ещё не создано');
    expect(container.textContent).toContain('Создать начисление');
  });

  it.each([
    ['cancelled', 'Начисление аннулировано'],
    ['paid', 'Заказ полностью оплачен'],
  ])('shows the %s state', (state, text) => {
    mockedFinance.mockReturnValue({
      data: {
        ...financeData,
        accrualStatus: state === 'cancelled' ? 'cancelled' : 'active',
        remainingMinor: state === 'paid' ? 0 : financeData.remainingMinor,
        remaining: state === 'paid' ? '0.00' : financeData.remaining,
      },
      isLoading: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useOrderFinance>);
    renderCard();
    expect(container.textContent).toContain(text);
  });
});
