import { App } from 'antd';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import useSWR from 'swr';

import {
  orderManagementKeys,
  updateOrderManagementSettings,
  type OrderManagementSettings,
} from '@shared/api';

import { OrderManagementSettingsPage } from './OrderManagementSettingsPage';

vi.mock('swr', () => ({ default: vi.fn() }));
vi.mock('./NotificationRulesCard', () => ({
  NotificationRulesCard: () => null,
}));
vi.mock('./DatabaseResetCard', () => ({ DatabaseResetCard: () => null }));
vi.mock('@shared/api', async () => ({
  ...(await import('@shared/api/order-management')),
  getProductionBoards: vi.fn(),
  updateOrderManagementSettings: vi.fn(),
}));

const settings: OrderManagementSettings = {
  id: 1,
  timeZone: 'Europe/Moscow',
  autoAddStatus: null,
  autoAddBoardId: null,
  autoAddStageId: null,
  autoAccrualStatus: null,
  dueDateRules: [],
};
const mockedUpdate = vi.mocked(updateOrderManagementSettings);
const mockedSWR = vi.mocked(useSWR);

describe('automatic accrual settings', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn(() => ({
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
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    mockedUpdate.mockResolvedValue(settings);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });
  const render = async (data = settings) => {
    mockedSWR.mockImplementation(
      (key) =>
        ({
          data: key === orderManagementKeys.settings ? data : { items: [] },
          isLoading: false,
          isValidating: false,
          error: undefined,
          mutate: vi.fn(),
        }) as ReturnType<typeof useSWR>,
    );
    await act(async () =>
      root.render(
        <App>
          <OrderManagementSettingsPage />
        </App>,
      ),
    );
    return Array.from(container.querySelectorAll('.ant-card')).find((card) =>
      card.textContent?.includes('Автоматическое начисление'),
    )!;
  };
  const submit = async (card: Element) => {
    await act(async () => {
      card
        .querySelector('form')!
        .dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true }),
        );
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  };
  it('starts disabled and saves the selected trigger without sending the settings id', async () => {
    const card = await render();
    const toggle = card.querySelector('[role="switch"]')!;
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(card.textContent).toContain('В производстве');
    expect(card.textContent).toContain(
      'Старые заказы автоматически не обрабатываются',
    );
    await act(async () => (toggle as HTMLButtonElement).click());
    await submit(card);
    expect(mockedUpdate).toHaveBeenCalledWith({
      timeZone: 'Europe/Moscow',
      autoAddStatus: null,
      autoAddBoardId: null,
      autoAddStageId: null,
      dueDateRules: [],
      autoAccrualStatus: 'in_production',
    });
  });
  it('disables the trigger and preserves board and due-date settings', async () => {
    const configured: OrderManagementSettings = {
      ...settings,
      autoAccrualStatus: 'completed',
      autoAddStatus: 'in_production',
      autoAddBoardId: 'board-1',
      autoAddStageId: 'stage-1',
      dueDateRules: [
        { status: 'in_production', customStatusId: null, workingDays: 10 },
      ],
    };
    const card = await render(configured);
    expect(card.textContent).toContain('Завершён');
    await act(async () =>
      (card.querySelector('[role="switch"]') as HTMLButtonElement).click(),
    );
    await submit(card);
    expect(mockedUpdate).toHaveBeenCalledWith({
      timeZone: configured.timeZone,
      autoAddStatus: configured.autoAddStatus,
      autoAddBoardId: configured.autoAddBoardId,
      autoAddStageId: configured.autoAddStageId,
      dueDateRules: configured.dueDateRules,
      autoAccrualStatus: null,
    });
  });
  it('preserves automatic accrual when saving the calendar', async () => {
    await render({ ...settings, autoAccrualStatus: 'completed' });
    await act(async () => {
      container
        .querySelector('form')!
        .dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true }),
        );
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(mockedUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ autoAccrualStatus: 'completed' }),
    );
  });
});
