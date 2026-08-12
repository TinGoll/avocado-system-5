import { act } from 'react';
import { createRoot } from 'react-dom/client';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

import type { PaginatedResponse } from './types';
import { useEntity } from './useEntity.swr';

vi.mock('swr', () => ({ default: vi.fn() }));
vi.mock('swr/mutation', () => ({ default: vi.fn() }));

const mockedUseSWR = vi.mocked(useSWR);
const mockedUseSWRMutation = vi.mocked(useSWRMutation);

type TestEntity = {
  id: string;
  name: string;
  productTemplates?: { id: string }[];
};

describe('useEntity cache updates', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('actualizes cached data after create, update, and delete', async () => {
    let cache: PaginatedResponse<TestEntity> = {
      items: [{ id: 'existing', name: 'Before' }],
      meta: { total: 1 },
    };
    const mutate = vi.fn(async (updater: unknown) => {
      cache =
        typeof updater === 'function'
          ? updater(cache)
          : (updater as PaginatedResponse<TestEntity>);
      return cache;
    });
    const created = { id: 'created', name: 'Created' };
    const updated = {
      id: 'existing',
      name: 'After',
      productTemplates: [{ id: 'template-1' }],
    };

    mockedUseSWR.mockReturnValue({
      data: cache,
      error: undefined,
      isLoading: false,
      mutate,
    } as never);
    mockedUseSWRMutation
      .mockReturnValueOnce({
        trigger: vi.fn().mockResolvedValue(created),
        isMutating: false,
      } as never)
      .mockReturnValueOnce({
        trigger: vi.fn().mockResolvedValue(updated),
        isMutating: false,
      } as never)
      .mockReturnValueOnce({
        trigger: vi.fn().mockResolvedValue(undefined),
        isMutating: false,
      } as never);

    let result:
      | ReturnType<
          typeof useEntity<
            TestEntity,
            PaginatedResponse<TestEntity>,
            Omit<TestEntity, 'id'>
          >
        >
      | undefined;
    const Probe = () => {
      result = useEntity<
        TestEntity,
        PaginatedResponse<TestEntity>,
        Omit<TestEntity, 'id'>
      >({ endpoint: 'test-entities' });
      return null;
    };
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => root.render(<Probe />));

    await act(async () => {
      await result?.create.trigger({ name: 'Created' });
    });
    expect(cache.items).toContainEqual(created);
    expect(cache.items?.some(({ id }) => id.startsWith('temp-'))).toBe(false);

    await act(async () => {
      await result?.update.trigger('existing', { name: 'After' });
    });
    expect(cache.items?.find(({ id }) => id === 'existing')).toEqual(updated);

    await act(async () => {
      await result?.remove.trigger('existing');
    });
    expect(cache.items?.some(({ id }) => id === 'existing')).toBe(false);

    act(() => root.unmount());
  });
});
