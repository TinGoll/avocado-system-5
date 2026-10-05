import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router';

import BasePage from './BasePage';

vi.mock('@widgets/navbar', () => ({ Navbar: () => null }));
vi.mock('@widgets/sidebar', () => ({ Sidebar: () => null }));

describe('BasePage', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('displays the build version in the footer', async () => {
    vi.stubEnv('VITE_APP_VERSION', '5.0.8');
    const container = document.createElement('div');
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          <MemoryRouter>
            <BasePage />
          </MemoryRouter>,
        );
      });

      expect(container.querySelector('footer')?.textContent).toBe(
        'Версия 5.0.8',
      );
    } finally {
      await act(async () => root.unmount());
      vi.unstubAllEnvs();
    }
  });
});
