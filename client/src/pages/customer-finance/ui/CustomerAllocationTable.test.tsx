import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';

import type { CustomerFinanceOrder } from '@shared/api';

import { CustomerAllocationTable } from './CustomerAllocationTable';

const orders: CustomerFinanceOrder[] = [
  {
    id: 1,
    name: 'Старый шкаф',
    orderNumber: 'A-100',
    createdAt: '2026-09-01T10:00:00.000Z',
    systemStatus: 'draft',
    closed: false,
    allocationAvailable: true,
    accrualId: 'accrual-1',
    accrualStatus: 'active',
    total: '100.00',
    paid: '0.00',
    debt: '80.00',
    missingToHalf: '50.00',
    financialStatus: 'unpaid',
  },
  {
    id: 2,
    name: 'Новая кухня',
    orderNumber: 'B-200',
    createdAt: '2026-09-02T10:00:00.000Z',
    systemStatus: 'in_production',
    closed: false,
    allocationAvailable: true,
    accrualId: 'accrual-2',
    accrualStatus: 'active',
    total: '100.00',
    paid: '60.00',
    debt: '40.00',
    missingToHalf: '0.00',
    financialStatus: 'prepaid',
  },
  {
    id: 3,
    name: 'Закрытая тумба',
    orderNumber: 'C-300',
    createdAt: '2026-09-03T10:00:00.000Z',
    systemStatus: 'completed',
    closed: true,
    allocationAvailable: false,
    accrualId: 'accrual-3',
    accrualStatus: 'active',
    total: '30.00',
    paid: '30.00',
    debt: '0.00',
    missingToHalf: '0.00',
    financialStatus: 'paid',
  },
];

describe('CustomerAllocationTable', () => {
  let container: HTMLDivElement;
  let root: Root;
  let values: Record<number, string>;

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
    values = {};
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document
      .querySelectorAll('.ant-select-dropdown')
      .forEach((item) => item.remove());
  });

  const renderTable = (balance = '50.00') => {
    const render = () =>
      root.render(
        <MemoryRouter>
          <CustomerAllocationTable
            orders={orders}
            balance={balance}
            availableStatuses={['draft', 'in_production', 'completed']}
            values={values}
            reasons={{}}
            onAutoAllocate={vi.fn()}
            onChange={(next) => {
              values = next;
              render();
            }}
          />
        </MemoryRouter>,
      );
    act(render);
  };

  const input = (name: string) =>
    container.querySelector<HTMLInputElement>(`input[aria-label="${name}"]`)!;
  const setInput = (element: HTMLInputElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    act(() => {
      setter?.call(element, value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
  };
  const button = (name: string, rowText: string) => {
    const row = [...container.querySelectorAll('tr')].find((item) =>
      item.textContent?.includes(rowText),
    );
    return [...(row?.querySelectorAll('button') ?? [])].find((item) =>
      item.textContent?.includes(name),
    )!;
  };

  it('sorts oldest first, filters by order name and hides closed orders', () => {
    renderTable();
    const rows = [...container.querySelectorAll('tbody tr')]
      .map((row) => row.textContent)
      .filter((text) => text?.includes('шкаф') || text?.includes('кухня'));
    expect(rows[0]).toContain('Старый шкаф');
    expect(rows[1]).toContain('Новая кухня');
    expect(container.textContent).not.toContain('Закрытая тумба');

    setInput(input('Поиск по названию заказа'), 'кухня');
    expect(container.textContent).not.toContain('Старый шкаф');
    expect(container.textContent).toContain('Новая кухня');
    setInput(input('Поиск по названию заказа'), 'A-100');
    expect(container.textContent).not.toContain('Старый шкаф');

    setInput(input('Поиск по названию заказа'), '');
    const checkbox = container.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    )!;
    act(() => checkbox.click());
    expect(container.textContent).toContain('Закрытая тумба');
    expect(input('Сумма для заказа Закрытая тумба').disabled).toBe(true);
  });

  it('validates input precision, debt and total available balance', () => {
    renderTable();
    setInput(input('Сумма для заказа Старый шкаф'), '80.01');
    expect(container.textContent).toContain('не может превышать долг');

    setInput(input('Сумма для заказа Старый шкаф'), '1.234');
    expect(container.textContent).toContain('не более двух знаков');

    setInput(input('Сумма для заказа Старый шкаф'), '40.00');
    setInput(input('Сумма для заказа Новая кухня'), '20.01');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      'превышает доступный',
    );
  });

  it('filters by system and financial statuses', () => {
    renderTable();
    const choose = (label: string, optionText: string) => {
      const select = input(label);
      act(() =>
        select.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })),
      );
      const option = [
        ...document.querySelectorAll('.ant-select-item-option'),
      ].find((item) => item.textContent === optionText) as HTMLElement;
      act(() => option.click());
    };

    choose('Системные статусы', 'В работе');
    expect(container.textContent).not.toContain('Старый шкаф');
    expect(container.textContent).toContain('Новая кухня');

    choose('Финансовый статус', 'Предоплата внесена');
    expect(container.textContent).toContain('Новая кухня');
    expect(container.textContent).not.toContain('Не оплачен');
  });

  it('applies quick actions, clears values and marks balance-limited payoff', () => {
    renderTable();
    act(() => button('До 50%', 'Старый шкаф').click());
    expect(input('Сумма для заказа Старый шкаф').value).toBe('50.00');

    act(() => button('Очистить', 'Старый шкаф').click());
    expect(input('Сумма для заказа Старый шкаф').value).toBe('');

    act(() => button('Погасить полностью', 'Старый шкаф').click());
    expect(input('Сумма для заказа Старый шкаф').value).toBe('50.00');
    expect(
      [...container.querySelectorAll('tr')]
        .find((row) => row.textContent?.includes('Старый шкаф'))
        ?.getAttribute('aria-label'),
    ).toContain('Частичное погашение');

    act(() => button('До 50%', 'Новая кухня').click());
    expect(input('Сумма для заказа Новая кухня').value).toBe('0.00');
  });

  it('disables allocation for zero and negative balance', () => {
    renderTable('-10.00');
    expect(input('Сумма для заказа Старый шкаф').disabled).toBe(true);
    expect(button('До 50%', 'Старый шкаф').disabled).toBe(true);
  });
});
