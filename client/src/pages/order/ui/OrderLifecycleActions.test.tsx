import { App } from 'antd';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import { orderFinanceKey } from '@entities/finance';
import { updateManagement } from '@shared/api';

import { OrderLifecycleActions } from './OrderLifecycleActions';

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('swr', () => ({ useSWRConfig: () => ({ mutate }) }));
vi.mock('@entities/finance', () => ({
  orderFinanceKey: (id: number) => `finance/order-groups/${id}`,
}));
vi.mock('@shared/api', async () => ({
  ...(await import('@shared/api/order-management')),
  updateManagement: vi.fn(),
}));
vi.mock('../api/useOrderProduction', () => ({
  useOrderProduction: () => ({ data: { productionComplete: false } }),
}));

const mockedUpdate = vi.mocked(updateManagement);

describe('OrderLifecycleActions automatic accrual', () => {
  let container: HTMLDivElement;
  let root: Root;
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });
  beforeEach(async () => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () =>
      root.render(
        <App>
          <OrderLifecycleActions
            groupId={42}
            status="draft"
            managementVersion={0}
          />
        </App>,
      ),
    );
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });
  it('refreshes the finance card after a successful status change', async () => {
    mockedUpdate.mockResolvedValue(
      {} as Awaited<ReturnType<typeof updateManagement>>,
    );
    await act(async () => container.querySelector('button')!.click());
    expect(mockedUpdate).toHaveBeenCalledWith('group', 42, {
      expectedVersion: 0,
      status: 'in_production',
    });
    expect(mutate).toHaveBeenCalledWith(orderFinanceKey(42));
  });
  it('shows the server reason for an accrual failure', async () => {
    const reason = 'Для создания начисления привяжите клиента к заказу.';
    mockedUpdate.mockRejectedValue({
      response: { status: 422, data: { error: { message: reason } } },
    });
    await act(async () => container.querySelector('button')!.click());
    expect(document.body.textContent).toContain(reason);
    expect(mutate).not.toHaveBeenCalled();
  });
});
