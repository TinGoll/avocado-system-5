import { App as AntdApp, Button, Form } from 'antd';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import {
  previewProductDisplayTemplate,
  useProductOutputVariables,
} from '../api/product-display-template';

import { ProductDisplayTemplateEditor } from './ProductDisplayTemplateEditor';

vi.mock('../api/product-display-template', async (importOriginal) => ({
  ...(await importOriginal()),
  previewProductDisplayTemplate: vi.fn(),
  useProductOutputVariables: vi.fn(),
}));

const mockedUseProductOutputVariables = vi.mocked(useProductOutputVariables);
const mockedPreviewProductDisplayTemplate = vi.mocked(
  previewProductDisplayTemplate,
);

const variables = [
  {
    path: 'item.width',
    label: 'Ширина позиции',
    description: 'Ширина позиции заказа',
    valueType: 'number' as const,
    unit: 'мм',
  },
  {
    path: 'material.name',
    label: 'Материал',
    description: 'Название материала',
    valueType: 'string' as const,
    optional: true,
  },
];

const setTextAreaValue = (textArea: HTMLTextAreaElement, value: string) => {
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLTextAreaElement.prototype,
    'value',
  )?.set;
  valueSetter?.call(textArea, value);
  textArea.dispatchEvent(new Event('input', { bubbles: true }));
  textArea.dispatchEvent(new Event('change', { bubbles: true }));
};

describe('ProductDisplayTemplateEditor', () => {
  let container: HTMLDivElement;
  let root: Root;
  let onFinish: ReturnType<typeof vi.fn>;

  const TestEditorForm = () => {
    const [form] = Form.useForm();

    return (
      <Form form={form} onFinish={onFinish}>
        <ProductDisplayTemplateEditor form={form} />
        <Button htmlType="submit">Сохранить</Button>
      </Form>
    );
  };

  const renderEditor = () => {
    act(() =>
      root.render(
        <AntdApp>
          <TestEditorForm />
        </AntdApp>,
      ),
    );
  };

  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      window.setTimeout(callback, 0),
    );
  });

  beforeEach(() => {
    vi.useFakeTimers();
    onFinish = vi.fn();
    mockedUseProductOutputVariables.mockReturnValue({
      data: variables,
      error: undefined,
      isLoading: false,
    } as ReturnType<typeof useProductOutputVariables>);
    mockedPreviewProductDisplayTemplate.mockResolvedValue({
      renderedValue: 'Предпросмотр',
    });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.querySelectorAll('.ant-tooltip').forEach((tooltip) => {
      tooltip.remove();
    });
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('shows localized variable buttons and metadata in the tooltip', async () => {
    renderEditor();

    expect(
      container.querySelector<HTMLTextAreaElement>('textarea')?.value,
    ).toBe(
      '{{ item.name }}: {{ item.height }} × {{ item.width }} - {{ item.quantity }}',
    );
    expect(container.textContent).toContain('Конструктор шаблона');
    expect(container.textContent).toContain('Ширина позиции, мм');
    expect(
      [...container.querySelectorAll('button')].some((button) =>
        button.textContent?.includes('item.width'),
      ),
    ).toBe(false);

    const materialButton = container.querySelector<HTMLButtonElement>(
      '[aria-label="Вставить переменную «Материал»"]',
    );
    if (!materialButton) throw new Error('Variable button not found');

    await act(async () => {
      materialButton.focus();
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain('Название материала');
    expect(document.body.textContent).toContain('{{ material.name }}');
    expect(document.body.textContent).toContain('Опциональное значение');
  });

  it('inserts at the cursor, restores focus and triggers preview', async () => {
    renderEditor();
    const textArea = container.querySelector<HTMLTextAreaElement>('textarea');
    const widthPreview = container.querySelector<HTMLInputElement>(
      '#displayTemplatePreview_width',
    );
    const heightPreview = container.querySelector<HTMLInputElement>(
      '#displayTemplatePreview_height',
    );
    const thicknessPreview = container.querySelector<HTMLInputElement>(
      '#displayTemplatePreview_thickness',
    );
    const widthButton = container.querySelector<HTMLButtonElement>(
      '[aria-label="Вставить переменную «Ширина позиции»"]',
    );
    if (
      !textArea ||
      !widthPreview ||
      !heightPreview ||
      !thicknessPreview ||
      !widthButton
    ) {
      throw new Error('Editor controls not found');
    }

    expect(widthPreview.value).toBe('600');
    expect(heightPreview.value).toBe('800');
    expect(thicknessPreview.value).toBe('18');
    expect(
      container.querySelector<HTMLInputElement>(
        '#displayTemplatePreview_material',
      )?.value,
    ).toBe('МДФ');
    expect(
      container.querySelector<HTMLInputElement>('#displayTemplatePreview_color')
        ?.value,
    ).toBe('Белый');
    expect(
      container.querySelector<HTMLInputElement>(
        '#displayTemplatePreview_patina',
      )?.value,
    ).toBe('Золотая');
    expect(
      container.querySelector<HTMLInputElement>(
        '#displayTemplatePreview_profile',
      )?.value,
    ).toBe('Классический');
    expect(
      container.querySelector<HTMLInputElement>('#displayTemplatePreview_panel')
        ?.value,
    ).toBe('Прямая');
    expect(
      container.querySelector<HTMLInputElement>(
        '#displayTemplatePreview_varnish',
      )?.value,
    ).toBe('Матовый');

    act(() => {
      setTextAreaValue(textArea, 'Размер:  мм');
      textArea.focus();
      textArea.setSelectionRange(8, 8);
      textArea.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      widthButton.click();
    });
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(textArea.value).toBe('Размер: {{ item.width }} мм');
    expect(document.activeElement).toBe(textArea);
    expect(textArea.selectionStart).toBe(24);
    expect(textArea.selectionEnd).toBe(24);

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });
    expect(mockedPreviewProductDisplayTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        displayTemplate: 'Размер: {{ item.width }} мм',
        item: expect.objectContaining({
          width: 600,
          height: 800,
          thickness: 18,
        }),
        orderCharacteristics: {
          material: { name: 'МДФ' },
          color: { name: 'Белый' },
          patina: { name: 'Золотая' },
          profile: { name: 'Классический' },
          panel: { name: 'Прямая' },
          varnish: { name: 'Матовый' },
        },
      }),
    );
    expect(
      container.querySelector('[aria-label="Предпросмотр шаблона"]')
        ?.textContent,
    ).toBe('Предпросмотр: Предпросмотр');
  });

  it('replaces a selection and allows repeated insertion', () => {
    renderEditor();
    const textArea = container.querySelector<HTMLTextAreaElement>('textarea');
    const button = container.querySelector<HTMLButtonElement>(
      '[aria-label="Вставить переменную «Материал»"]',
    );
    if (!textArea || !button) throw new Error('Editor controls not found');

    act(() => {
      setTextAreaValue(textArea, 'Материал: старый');
      textArea.focus();
      textArea.setSelectionRange(10, 16);
      textArea.dispatchEvent(new Event('select', { bubbles: true }));
      button.click();
      vi.advanceTimersByTime(1);
      button.click();
      vi.advanceTimersByTime(1);
    });

    expect(textArea.value).toBe(
      'Материал: {{ material.name }}{{ material.name }}',
    );
  });

  it('supports manual input and variable buttons do not submit the form', async () => {
    renderEditor();
    const textArea = container.querySelector<HTMLTextAreaElement>('textarea');
    const button = container.querySelector<HTMLButtonElement>(
      '[aria-label="Вставить переменную «Материал»"]',
    );
    if (!textArea || !button) throw new Error('Editor controls not found');

    act(() => setTextAreaValue(textArea, 'Ручной текст'));
    act(() => button.click());
    await act(async () => Promise.resolve());

    expect(textArea.value).toBe('Ручной текст{{ material.name }}');
    expect(button.type).toBe('button');
    expect(onFinish).not.toHaveBeenCalled();
  });

  it.each([
    [
      'loading',
      { data: undefined, error: undefined, isLoading: true },
      '.ant-spin-spinning',
    ],
    [
      'error',
      { data: undefined, error: new Error('Failed'), isLoading: false },
      'Не удалось загрузить доступные переменные',
    ],
    [
      'empty',
      { data: [], error: undefined, isLoading: false },
      'Нет доступных переменных',
    ],
  ])('renders the %s state', (_state, hookValue, expected) => {
    mockedUseProductOutputVariables.mockReturnValue(
      hookValue as ReturnType<typeof useProductOutputVariables>,
    );
    renderEditor();

    if (expected.startsWith('.')) {
      expect(container.querySelector(expected)).not.toBeNull();
    } else {
      expect(container.textContent).toContain(expected);
    }
    expect(container.querySelector('textarea')).not.toBeNull();
  });
});
