import { App as AntdApp } from 'antd';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import type { PriceModifier } from '@entities/price-modifiers';
import type { ProductTemplate } from '@entities/product';

import { useCreateProductTemplates } from '../hooks/useCreateProductTemplates';

import { CreateForm } from './CreateForm';

vi.mock('../hooks/useCreateProductTemplates', () => ({
  useCreateProductTemplates: vi.fn(),
}));

const mockedUseCreateProductTemplates = vi.mocked(useCreateProductTemplates);

const product = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Фасад',
  defaultCharacteristics: {},
  customerPricingMethod: 'per_item',
  baseCustomerPrice: 100,
  attributes: {},
} satisfies ProductTemplate;

const scopedModifier = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Срочность',
  type: 'percentage',
  value: 10,
  priority: 1,
  conditions: { AND: [] },
  productTemplates: [product],
  createdAt: new Date('2026-08-12T00:00:00.000Z'),
  updatedAt: new Date('2026-08-12T00:00:00.000Z'),
} satisfies PriceModifier;

const globalModifier = {
  ...scopedModifier,
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Сезонный',
  productTemplates: [],
} satisfies PriceModifier;

const setInputValue = (input: HTMLInputElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set;
  valueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
};

describe('CreateForm', () => {
  let container: HTMLDivElement;
  let root: Root;
  let trigger: ReturnType<typeof vi.fn>;

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
    trigger = vi.fn().mockResolvedValue(product);
    mockedUseCreateProductTemplates.mockReturnValue({
      isMutating: false,
      trigger,
      products: [],
      priceModifiers: [scopedModifier, globalModifier],
      priceModifiersError: undefined,
      isLoading: false,
    } as ReturnType<typeof useCreateProductTemplates>);

    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.querySelectorAll('.ant-select-dropdown').forEach((dropdown) => {
      dropdown.remove();
    });
    vi.clearAllMocks();
  });

  it('sends selected scoped modifiers when creating a product', async () => {
    act(() =>
      root.render(
        <AntdApp>
          <CreateForm />
        </AntdApp>,
      ),
    );

    const nameInput = container.querySelector<HTMLInputElement>(
      '#create_product_template_form_name',
    );
    const modifierSelector = container
      .querySelector<HTMLElement>('[aria-label="Ценовые модификаторы"]')
      ?.closest('.ant-select')
      ?.querySelector<HTMLElement>('.ant-select-selector');
    if (!nameInput || !modifierSelector) {
      throw new Error('Create product form controls not found');
    }

    act(() => setInputValue(nameInput, 'Новый фасад'));
    act(() => {
      modifierSelector.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      );
    });

    const options = [
      ...document.querySelectorAll<HTMLElement>('.ant-select-item-option'),
    ];
    const scopedOption = options.find((option) =>
      option.textContent?.includes(scopedModifier.name),
    );
    expect(container.textContent).toContain(
      'Глобальные модификаторы уже применяются ко всем продуктам',
    );
    if (!scopedOption) throw new Error('Scoped modifier option not found');
    act(() => scopedOption.click());

    const submitButton = container.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    if (!submitButton) throw new Error('Submit button not found');

    await act(async () => {
      submitButton.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(trigger).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Новый фасад',
        priceModifierIds: [scopedModifier.id],
      }),
    );
  });
});
