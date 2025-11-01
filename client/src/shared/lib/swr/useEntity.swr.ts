import { useMemo } from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

import { fetcher } from './fetcher.swr';
import type {
  BaseEntity,
  EntityID,
  MutationCallbacks,
  PaginatedResponse,
  UseEntityOptions,
} from './types';

export function useEntity<
  R extends BaseEntity,
  TTransformedData = PaginatedResponse<R>,
  C = Omit<R, 'id' | 'createdAt' | 'updatedAt'>,
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

  const optimisticMutate = async (
    updater: (prev?: PaginatedResponse<R>) => PaginatedResponse<R>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    promise: Promise<any>,
    rollback?: PaginatedResponse<R>,
  ) => {
    await mutate(updater, { revalidate: false });

    try {
      const result = await promise;
      revalidateExtraKeys();
      return result;
    } catch (err) {
      if (rollback) await mutate(rollback, { revalidate: false });
      throw err;
    }
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
    const tempId = `temp-${Math.random()}`;
    const tempItem = { ...(newItem as object), id: tempId } as R;
    const rollback = data;

    const promise = (createTrigger as (arg: C) => Promise<R>)(newItem).then(
      (savedItem) => {
        mutate(
          (current) => ({
            ...current,
            items: current?.items?.map((i) =>
              i.id === tempId ? savedItem : i,
            ),
          }),
          { revalidate: false },
        );
        options?.onSuccess?.(savedItem);
        return savedItem;
      },
    );

    await optimisticMutate(
      (current) => ({
        items: [tempItem, ...(current?.items ?? [])],
        meta: current?.meta ?? {},
      }),
      promise,
      rollback,
    );
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
    const rollback = data;

    const promise = updateTrigger({ id, data: updates }).then((updatedItem) => {
      options?.onSuccess?.(updatedItem);
      return updatedItem;
    });

    await optimisticMutate(
      (current) => ({
        ...current,
        items: current?.items?.map((i) =>
          i.id === id ? { ...i, ...updates } : i,
        ),
      }),
      promise,
      rollback,
    );
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
    const rollback = data;

    const promise = deleteTrigger(id).then(() => {
      options?.onSuccess?.();
    });

    await optimisticMutate(
      (current) => ({
        ...current,
        items: current?.items?.filter((i) => i.id !== id),
      }),
      promise,
      rollback,
    );
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
