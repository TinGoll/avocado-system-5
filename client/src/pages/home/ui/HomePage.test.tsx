import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';

import { useOrderGroups, ORDER_STATUS } from '@entities/order';

import { HomePage } from './HomePage';

vi.mock('@entities/order', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@entities/order')>()),
  useOrderGroups: vi.fn(),
}));

it.each([
  ['confirmed', '/order/group-1'],
  [ORDER_STATUS.DRAFT, '/order/group-1/editing'],
])('opens documents in a %s order', async (status, path) => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  vi.mocked(useOrderGroups).mockReturnValue({
    data: {
      groups: [
        {
          id: 'group-1',
          status,
          orderNumber: 'AB-001',
          orders: [
            {
              id: 'doc-1',
              documentNumber: 5,
              name: 'Фасады',
              characteristics: { material: { name: 'Дуб' } },
              items: [],
              totalPrice: 100,
            },
            {
              id: 'doc-2',
              documentNumber: 8,
              name: '',
              items: [],
              totalPrice: 0,
            },
          ],
        },
      ],
    },
    isLoading: false,
  } as unknown as ReturnType<typeof useOrderGroups>);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>,
      ),
    );
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('.ant-table-row-expand-icon')!
        .click(),
    );
    expect(
      container
        .querySelector('a[aria-label="Открыть Фасады"]')
        ?.getAttribute('href'),
    ).toBe(`${path}?document=5`);
    expect(
      container
        .querySelector('a[aria-label="Открыть Документ 8"]')
        ?.getAttribute('href'),
    ).toBe(`${path}?document=8`);
    expect(container.textContent).toContain('Дуб');
    expect(container.textContent).not.toContain('Добавить документ');
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.clearAllMocks();
  }
});
