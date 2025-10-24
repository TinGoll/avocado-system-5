import { useMemo } from 'react';
import useSWR, { type SWRConfiguration } from 'swr';
import type { SWRMutationConfiguration } from 'swr/mutation';
import useSWRMutation from 'swr/mutation';

type Endpoints = 'test';

import { fetcher } from './fetcher.swr';

export type EntityID = string | number;

export interface BaseEntity {
  id: EntityID;
}

export interface MutationCallbacks<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: Record<string, unknown>;
}

export interface UseEntityOptions<
  R extends BaseEntity,
  TTransformedData = PaginatedResponse<R>,
> {
  endpoint: Endpoints;
  swrConfig?: SWRConfiguration<PaginatedResponse<R>>;
  transform: (data: PaginatedResponse<R>) => TTransformedData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mutationConfig?: SWRMutationConfiguration<any, Error, string, any>;
  extraKeysToRevalidate?: string[];
}

export function useEntity<
  R extends BaseEntity,
  TTransformedData = PaginatedResponse<R>,
  C = Omit<R, 'id'>,
  U = Partial<C>,
>({
  endpoint,
  swrConfig,
  transform,
  mutationConfig,
  extraKeysToRevalidate = [],
}: UseEntityOptions<R, TTransformedData>) {
  const { data, error, isLoading, mutate } = useSWR<
    PaginatedResponse<R>,
    Error
  >(endpoint, (url: string) => fetcher({ url }), swrConfig);

  const transformedData = useMemo(
    () => (data ? transform(data) : undefined),
    [data, transform],
  );

  const revalidateExtraKeys = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extraKeysToRevalidate.forEach((key) => mutate(key as any));
  };

  // --- CREATE ---
  const { trigger: createTrigger, ...createMutation } = useSWRMutation<
    R,
    Error,
    string,
    C
  >(
    endpoint,
    (url, { arg }) => fetcher<R, C>({ url, method: 'POST', data: arg }),
    {
      ...mutationConfig,
      onSuccess: () => revalidateExtraKeys(),
    },
  );

  /**
   * Создает новую сущность.
   * @param newItem - Данные для создания.
   * @param options - Опциональные колбэки onSuccess и onError.
   */
  const create = async (newItem: C, options?: MutationCallbacks<R>) => {
    const tempItem = { ...newItem, id: 'temp-id' } as unknown as R;

    await mutate(
      (current) => ({
        items: [tempItem, ...(current?.items ?? [])],
        meta: current?.meta ?? {},
      }),
      { revalidate: false },
    );

    try {
      const savedItem = await (createTrigger as (arg: C) => Promise<R>)(
        newItem,
      );

      await mutate(
        (current) => ({
          items: (current?.items ?? []).map((item) =>
            item.id === 'temp-id' ? savedItem : item,
          ),
          meta: current?.meta ?? {},
        }),
        { revalidate: false },
      );

      options?.onSuccess?.(savedItem);
      return savedItem;
    } catch (e) {
      const error = e as Error;
      options?.onError?.(error);
      await mutate();
      throw error;
    }
  };
  // --- UPDATE ---
  const { trigger: updateTrigger, ...updateMutation } = useSWRMutation<
    R,
    Error,
    string,
    { id: EntityID; data: U }
  >(
    endpoint,
    (_, { arg: { id, data } }) =>
      fetcher<R, U>({ url: `${endpoint}/${id}`, method: 'PATCH', data }),
    {
      ...mutationConfig,
      onSuccess: () => revalidateExtraKeys(),
    },
  );

  /**
   * Обновляет существующую сущность.
   * @param id - ID сущности для обновления.
   * @param updates - Данные для обновления.
   * @param options - Опциональные колбэки onSuccess и onError.
   */
  const update = async (
    id: EntityID,
    updates: U,
    options?: MutationCallbacks<R>,
  ) => {
    await mutate(
      (current) => {
        if (!current) return { items: [], meta: {} };
        return {
          ...current,
          items: current.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item,
          ),
        };
      },
      { revalidate: false },
    );

    try {
      const updatedItem = await updateTrigger({ id, data: updates });
      options?.onSuccess?.(updatedItem);
      return updatedItem;
    } catch (e) {
      const error = e as Error;
      options?.onError?.(error);
      await mutate();
      throw error;
    }
  };

  // --- DELETE ---
  const { trigger: deleteTrigger, ...deleteMutation } = useSWRMutation<
    void,
    Error,
    string,
    EntityID
  >(
    endpoint,
    (_, { arg: id }) =>
      fetcher<void>({ url: `${endpoint}/${id}`, method: 'DELETE' }),
    {
      ...mutationConfig,
      onSuccess: () => revalidateExtraKeys(),
    },
  );

  /**
   * Удаляет сущность.
   * @param id - ID сущности для удаления.
   * @param options - Опциональные колбэки onSuccess и onError.
   */
  const remove = async (id: EntityID, options?: MutationCallbacks<void>) => {
    await mutate(
      (current) => {
        if (!current) return { items: [], meta: {} };
        return {
          ...current,
          items: current.items.filter((item) => item.id !== id),
        };
      },
      { revalidate: false },
    );

    try {
      await deleteTrigger(id);
      options?.onSuccess?.();
    } catch (e) {
      const error = e as Error;
      options?.onError?.(error);
      await mutate();
      throw error;
    }
  };

  return {
    data: transformedData,
    error,
    isLoading,
    create: { trigger: create, ...createMutation },
    update: { trigger: update, ...updateMutation },
    remove: { trigger: remove, ...deleteMutation },
  };
}
