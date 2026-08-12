import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import {
  usePriceModifiers,
  type PriceModifier,
} from '@entities/price-modifiers';

import { PriceModifiersPage } from './PriceModifiersPage';

vi.mock('@entities/price-modifiers', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@entities/price-modifiers')>();

  return { ...actual, usePriceModifiers: vi.fn() };
});

vi.mock('@features/create-price-modifiers', () => ({
  PriceModifierForm: () => <div>Форма модификатора</div>,
}));

const mockedUsePriceModifiers = vi.mocked(usePriceModifiers);

const modifier: PriceModifier = {
  id: 'modifier-1',
  name: 'Срочный заказ',
  type: 'percentage',
  value: 20,
  priority: 3,
  conditions: {
    source: 'order_group',
    path: 'status',
    operator: 'eq',
    value: 'urgent',
  },
  productTemplates: [],
  createdAt: new Date('2026-08-10T00:00:00.000Z'),
  updatedAt: new Date('2026-08-10T00:00:00.000Z'),
};

describe('PriceModifiersPage', () => {
  let container: HTMLDivElement;
  let root: Root;
  let removeTrigger: ReturnType<typeof vi.fn>;

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
    removeTrigger = vi.fn().mockResolvedValue(undefined);
    mockedUsePriceModifiers.mockReturnValue({
      data: { modifiers: [modifier], map: { [modifier.id]: modifier } },
      error: undefined,
      isLoading: false,
      create: { trigger: vi.fn(), isMutating: false },
      update: { trigger: vi.fn(), isMutating: false },
      remove: { trigger: removeTrigger, isMutating: false },
    } as unknown as ReturnType<typeof usePriceModifiers>);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  it('renders the modifier list with its scope', () => {
    act(() => root.render(<PriceModifiersPage />));

    expect(container.textContent).toContain('Срочный заказ');
    expect(container.textContent).toContain('Процент');
    expect(container.textContent).toContain('20%');
    expect(container.textContent).toContain('3');
    expect(container.textContent).toContain('Глобальный');
  });

  it('deletes a modifier only after confirmation', async () => {
    act(() => root.render(<PriceModifiersPage />));

    const deleteButton = container.querySelector<HTMLButtonElement>(
      '[aria-label="Удалить Срочный заказ"]',
    );
    expect(deleteButton).not.toBeNull();
    act(() => deleteButton?.click());
    expect(removeTrigger).not.toHaveBeenCalled();

    const confirmButton = [...document.querySelectorAll('button')].find(
      (button) => button.textContent === 'Удалить',
    );
    expect(confirmButton).toBeDefined();
    await act(async () => {
      confirmButton?.click();
      await Promise.resolve();
    });

    expect(removeTrigger).toHaveBeenCalledWith(modifier.id);
  });
});
