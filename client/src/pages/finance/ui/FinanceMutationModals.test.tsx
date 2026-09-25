import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { getFinanceAccruals, getFinancePayment } from '@shared/api';

import { useFinanceMutations } from '../api/finance-mutations';

import { FinanceMutationModals } from './FinanceMutationModals';

vi.mock('@shared/api', () => ({
  getFinanceAccruals: vi.fn(),
  getFinancePayment: vi.fn(),
}));
vi.mock('../api/finance-mutations', () => ({
  useFinanceMutations: vi.fn(),
}));

const mockedMutations = vi.mocked(useFinanceMutations);
const mockedAccruals = vi.mocked(getFinanceAccruals);
const mockedPayment = vi.mocked(getFinancePayment);
const setInputValue = (
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) => {
  const prototype =
    input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

describe('FinanceMutationModals', () => {
  let container: HTMLDivElement;
  let root: Root;
  let adjust: ReturnType<typeof vi.fn>;

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
    adjust = vi
      .fn()
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 409 } })
      .mockResolvedValueOnce({});
    mockedMutations.mockReturnValue({
      adjustFinanceAccrual: adjust,
      createManualAccrual: vi.fn(),
      createFinancePayment: vi.fn(),
      syncFinanceAccrual: vi.fn(),
      cancelFinanceAccrual: vi.fn(),
      replaceFinanceAllocations: vi.fn(),
      cancelFinancePayment: vi.fn(),
      invalidate: vi.fn(),
    });
    mockedAccruals.mockResolvedValue({
      items: [
        {
          id: 'accrual-1',
          customerId: 'customer-1',
          customerName: 'Заказчик',
          sourceType: 'manual',
          orderGroupId: null,
          orderNumber: null,
          title: 'Услуга',
          status: 'active',
          version: 4,
          businessDate: '2026-09-25',
          amountMinor: 10000,
          amount: '100.00',
          allocatedMinor: 0,
          allocated: '0.00',
          remainingMinor: 10000,
          remaining: '100.00',
          state: 'unpaid',
        },
      ],
      meta: { nextCursor: null },
    });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document
      .querySelectorAll('.ant-modal-root')
      .forEach((node) => node.remove());
    vi.clearAllMocks();
  });

  it('keeps the draft and applies it to a freshly loaded version after 409', async () => {
    act(() =>
      root.render(
        <FinanceMutationModals
          action={{
            type: 'adjust-accrual',
            accrual: {
              id: 'accrual-1',
              customerId: 'customer-1',
              customerName: 'Заказчик',
              sourceType: 'manual',
              orderGroupId: null,
              orderNumber: null,
              title: 'Услуга',
              status: 'active',
              version: 3,
              businessDate: '2026-09-25',
              amountMinor: 10000,
              amount: '100.00',
              allocatedMinor: 0,
              allocated: '0.00',
              remainingMinor: 10000,
              remaining: '100.00',
              state: 'unpaid',
            },
          }}
          customers={[]}
          onClose={vi.fn()}
        />,
      ),
    );
    const modal = document.querySelector('.ant-modal')!;
    const inputs = modal.querySelectorAll<HTMLInputElement>('input');
    await act(async () => {
      setInputValue(inputs[0], '25.00');
      const reason = modal.querySelector<HTMLTextAreaElement>('textarea')!;
      setInputValue(reason, 'Изменение объёма');
      modal.querySelector<HTMLButtonElement>('.ant-btn-primary')!.click();
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(modal.textContent).toContain('Данные изменились на сервере');
    expect(modal.querySelector<HTMLInputElement>('input')?.value).toBe('25.00');

    await act(async () => {
      modal.querySelector<HTMLButtonElement>('.ant-btn-primary')!.click();
      await Promise.resolve();
    });
    expect(adjust).toHaveBeenLastCalledWith(
      'accrual-1',
      expect.objectContaining({ expectedVersion: 4, amount: '25.00' }),
    );
  });

  it('shows released allocation history in the full-map editor', async () => {
    mockedPayment.mockResolvedValue({
      id: 'payment-1',
      customerId: 'customer-1',
      version: 2,
      allocations: [
        {
          id: 'allocation-1',
          accrualId: 'accrual-1',
          amount: '20.00',
          amountMinor: 2000,
          status: 'released',
          releaseReason: 'Перераспределено',
        },
      ],
    } as Awaited<ReturnType<typeof getFinancePayment>>);

    await act(async () => {
      root.render(
        <FinanceMutationModals
          action={{
            type: 'allocations',
            payment: {
              id: 'payment-1',
              customerId: 'customer-1',
              customerName: 'Заказчик',
              businessDate: '2026-09-25',
              method: 'cash',
              externalReference: null,
              comment: null,
              status: 'posted',
              version: 2,
              amountMinor: 5000,
              amount: '50.00',
              allocatedMinor: 0,
              allocated: '0.00',
              unallocatedMinor: 5000,
              unallocated: '50.00',
              allocationState: 'unallocated',
            },
          }}
          customers={[]}
          onClose={vi.fn()}
        />,
      );
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(document.querySelector('.ant-modal')?.textContent).toContain(
      '20.00 ₽ — Перераспределено',
    );
  });
});
