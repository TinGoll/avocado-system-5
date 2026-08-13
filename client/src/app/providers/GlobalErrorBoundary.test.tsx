import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { reportClientError } from '@shared/api';

import { GlobalErrorBoundary } from './GlobalErrorBoundary';

vi.mock('@shared/api', () => ({ reportClientError: vi.fn() }));

const BrokenComponent = () => {
  throw new Error('Render failed');
};

describe('GlobalErrorBoundary', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('shows recovery actions and reports a render error', () => {
    act(() => {
      root.render(
        <GlobalErrorBoundary>
          <BrokenComponent />
        </GlobalErrorBoundary>,
      );
    });

    expect(container.textContent).toContain('Что-то пошло не так');
    expect(container.textContent).toContain('Перезагрузить страницу');
    expect(container.textContent).toContain('Вернуться на главную');
    expect(reportClientError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Render failed' }),
    );
  });
});
