import { act } from 'react';
import { createRoot } from 'react-dom/client';

import { Endpoints, useEntity, type PaginatedResponse } from '@shared/lib/swr';

import type { Customer } from '../model/customer';

import { useCustomers } from './customer.api';

vi.mock('@shared/lib/swr', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shared/lib/swr')>();

  return {
    ...actual,
    useEntity: vi.fn(),
  };
});

const mockedUseEntity = vi.mocked(useEntity);

describe('useCustomers', () => {
  beforeAll(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('loads customers through the customers endpoint and builds a map', () => {
    mockedUseEntity.mockImplementation(
      ({ transform }) =>
        ({
          data: (
            transform as
              | ((response: PaginatedResponse<Customer>) => unknown)
              | undefined
          )?.({
            items: [
              { id: 'customer-1', name: 'Иван Петров', level: 'gold' },
              { id: 'customer-2', name: 'Анна Соколова', level: 'silver' },
            ],
            meta: { total: 2 },
          }),
          error: undefined,
          isLoading: false,
        }) as ReturnType<typeof useEntity>,
    );

    let result: ReturnType<typeof useCustomers> | undefined;
    const Probe = () => {
      result = useCustomers();
      return null;
    };
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => root.render(<Probe />));

    expect(mockedUseEntity).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: Endpoints.CUSTOMERS }),
    );
    expect(result?.customers).toHaveLength(2);
    expect(result?.map['customer-2']?.name).toBe('Анна Соколова');
    expect(result?.isLoading).toBe(false);
    expect(result?.error).toBeUndefined();

    act(() => root.unmount());
  });

  it('exposes loading and error states with empty data', () => {
    const error = new Error('Request failed');
    mockedUseEntity.mockReturnValue({
      data: undefined,
      error,
      isLoading: true,
    } as ReturnType<typeof useEntity>);

    let result: ReturnType<typeof useCustomers> | undefined;
    const Probe = () => {
      result = useCustomers();
      return null;
    };
    const container = document.createElement('div');
    const root = createRoot(container);

    act(() => root.render(<Probe />));

    expect(result).toMatchObject({
      customers: [],
      map: {},
      isLoading: true,
      error,
    });

    act(() => root.unmount());
  });
});
