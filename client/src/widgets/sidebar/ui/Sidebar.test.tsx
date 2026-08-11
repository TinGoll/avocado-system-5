import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';

import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
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
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('links to the price modifiers route and selects it', () => {
    act(() =>
      root.render(
        <MemoryRouter initialEntries={['/price-modifiers']}>
          <Sidebar />
        </MemoryRouter>,
      ),
    );

    const link = container.querySelector<HTMLAnchorElement>(
      'a[href="/price-modifiers"]',
    );
    expect(link?.textContent).toBe('Модификаторы цен');
    expect(
      link
        ?.closest('.ant-menu-item')
        ?.classList.contains('ant-menu-item-selected'),
    ).toBe(true);
  });
});
