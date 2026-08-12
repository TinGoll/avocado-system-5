import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import {
  usePriceModifiers,
  type PriceModifier,
} from '@entities/price-modifiers';
import { useProductTemplates, type ProductTemplate } from '@entities/product';

import { useConditionPathSchemas } from '../api/useConditionPathSchemas';
import { usePriceModifierStore } from '../model/priceModifierStore';

import { PriceModifierForm } from './PriceModifierForm';

vi.mock('@entities/price-modifiers', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@entities/price-modifiers')>();

  return {
    ...actual,
    usePriceModifiers: vi.fn(),
  };
});

vi.mock('@entities/product', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@entities/product')>();

  return {
    ...actual,
    useProductTemplates: vi.fn(),
  };
});

vi.mock('../api/useConditionPathSchemas', () => ({
  useConditionPathSchemas: vi.fn(),
}));

const mockedUsePriceModifiers = vi.mocked(usePriceModifiers);
const mockedUseProductTemplates = vi.mocked(useProductTemplates);
const mockedUseConditionPathSchemas = vi.mocked(useConditionPathSchemas);

const productTemplate = {
  id: 'template-1',
  name: 'Фасад',
  defaultCharacteristics: {},
  customerPricingMethod: 'per_item',
  baseCustomerPrice: 100,
  attributes: {},
} satisfies ProductTemplate;

const modifier: PriceModifier = {
  id: '',
  name: 'Срочный заказ',
  type: 'percentage',
  value: 10,
  priority: 1,
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

const savedModifier: PriceModifier = {
  ...modifier,
  id: 'modifier-1',
};

const findSaveButton = (container: HTMLElement) => {
  const button = [...container.querySelectorAll('button')].find((element) =>
    element.textContent?.includes('Сохранить'),
  );

  if (!button) throw new Error('Save button not found');
  return button;
};

describe('PriceModifierForm', () => {
  let container: HTMLDivElement;
  let root: Root;
  let createTrigger: ReturnType<typeof vi.fn>;

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
    createTrigger = vi.fn();
    mockedUseConditionPathSchemas.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
    } as ReturnType<typeof useConditionPathSchemas>);
    mockedUsePriceModifiers.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      create: { trigger: createTrigger, isMutating: false },
      update: { trigger: vi.fn(), isMutating: false },
      remove: { trigger: vi.fn(), isMutating: false },
    } as unknown as ReturnType<typeof usePriceModifiers>);
    mockedUseProductTemplates.mockReturnValue({
      data: { products: [productTemplate], map: {} },
      error: undefined,
      isLoading: false,
    } as ReturnType<typeof useProductTemplates>);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  it('saves the modifier and reports success', async () => {
    createTrigger.mockResolvedValue(savedModifier);
    const onSaved = vi.fn();

    act(() =>
      root.render(
        <PriceModifierForm initialModifier={modifier} onSaved={onSaved} />,
      ),
    );
    await act(async () => {
      findSaveButton(container).click();
      await Promise.resolve();
    });

    expect(createTrigger).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Срочный заказ',
        productTemplateIds: [],
      }),
    );
    expect(onSaved).toHaveBeenCalledWith(savedModifier);
    expect(container.textContent).toContain('Модификатор сохранён');
  });

  it('creates a modifier for selected product templates', async () => {
    createTrigger.mockResolvedValue({
      ...savedModifier,
      productTemplates: [productTemplate],
    });

    act(() => root.render(<PriceModifierForm initialModifier={modifier} />));
    act(() => {
      usePriceModifierStore
        .getState()
        .actions.updateField('productTemplates', [productTemplate]);
    });
    await act(async () => {
      findSaveButton(container).click();
      await Promise.resolve();
    });

    expect(createTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ productTemplateIds: ['template-1'] }),
    );
  });

  it('stretches the product template selector to the form width', () => {
    act(() => root.render(<PriceModifierForm initialModifier={modifier} />));

    const selector = container
      .querySelector('#price-modifier-product-templates')
      ?.closest<HTMLElement>('.ant-select');

    expect(selector?.style.width).toBe('100%');
  });

  it('initializes nested conditions for editing and sends the edited tree', async () => {
    const nestedModifier: PriceModifier = {
      ...savedModifier,
      conditions: {
        AND: [
          modifier.conditions,
          {
            OR: [
              {
                source: 'item',
                path: 'quantity',
                operator: 'gte',
                value: 2,
              },
            ],
          },
        ],
      },
    };
    const updateTrigger = vi.fn().mockResolvedValue(nestedModifier);
    mockedUsePriceModifiers.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      create: { trigger: createTrigger, isMutating: false },
      update: { trigger: updateTrigger, isMutating: false },
      remove: { trigger: vi.fn(), isMutating: false },
    } as unknown as ReturnType<typeof usePriceModifiers>);

    act(() =>
      root.render(<PriceModifierForm initialModifier={nestedModifier} />),
    );

    expect(usePriceModifierStore.getState().modifier.conditions).toEqual(
      nestedModifier.conditions,
    );

    act(() => {
      usePriceModifierStore
        .getState()
        .actions.updateConditionField(
          ['conditions', 'AND', 1, 'OR', 0],
          'value',
          5,
        );
    });
    await act(async () => {
      findSaveButton(container).click();
      await Promise.resolve();
    });

    expect(updateTrigger).toHaveBeenCalledWith(
      nestedModifier.id,
      expect.objectContaining({
        conditions: expect.objectContaining({ AND: expect.any(Array) }),
      }),
    );
    expect(
      (
        updateTrigger.mock.calls[0][1].conditions as {
          AND: [unknown, { OR: [{ value: number }] }];
        }
      ).AND[1].OR[0].value,
    ).toBe(5);
  });

  it('resets the store when the form is closed', () => {
    act(() =>
      root.render(<PriceModifierForm initialModifier={savedModifier} />),
    );
    expect(usePriceModifierStore.getState().modifier.id).toBe(savedModifier.id);

    act(() => root.unmount());

    expect(usePriceModifierStore.getState().modifier.id).toBe('');
    root = createRoot(container);
  });

  it('shows a server error', async () => {
    createTrigger.mockRejectedValue({
      response: {
        data: { error: { message: 'Название уже используется' } },
      },
    });

    act(() => root.render(<PriceModifierForm />));
    await act(async () => {
      findSaveButton(container).click();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Название уже используется');
  });

  it('blocks repeated submission while saving', async () => {
    let resolveRequest: ((value: PriceModifier) => void) | undefined;
    createTrigger.mockImplementation(
      () =>
        new Promise<PriceModifier>((resolve) => {
          resolveRequest = resolve;
        }),
    );

    act(() => root.render(<PriceModifierForm />));
    act(() => {
      const button = findSaveButton(container);
      button.click();
      button.click();
    });

    expect(createTrigger).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRequest?.(savedModifier);
      await Promise.resolve();
    });
  });
});
