import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Outlet } from 'react-router';

import { routesElements } from './routesElements';

vi.mock('@pages/base', () => ({ default: () => <Outlet /> }));
vi.mock('@shared/layouts', () => ({ AppLayout: () => <Outlet /> }));
vi.mock('@pages/price-modifiers', () => ({
  default: () => <div>Маршрут модификаторов</div>,
}));

describe('routesElements', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('renders the price modifiers page by its URL', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/price-modifiers']}>
          {routesElements()}
        </MemoryRouter>,
      );
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Маршрут модификаторов');
  });
});
