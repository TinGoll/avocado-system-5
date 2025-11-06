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
  disabled = false,
}: UseEntityOptions<R, TTransformedData>) {
  const shouldFetch = !disabled && Boolean(endpoint);

  const { data, error, isLoading, mutate } = useSWR<
    PaginatedResponse<R>,
    Error
  >(
    shouldFetch ? endpoint : null,
    (url: string) => fetcher({ url }),
    swrConfig,
  );

  const transformedData = useMemo(() => {
    if (!(typeof transform === 'function')) {
      return data;
    }
    return data ? transform(data) : undefined;
  }, [data, transform]);

  const revalidateExtraKeys = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extraKeysToRevalidate.forEach((key) => mutate(key as any));
  };

  const optimisticMutate = async <T = R>(
    updater: (prev?: PaginatedResponse<R>) => PaginatedResponse<R>,
    promise: Promise<T>,
    rollback?: PaginatedResponse<R>,
  ) => {
    if (!mutate) {
      return promise;
    }
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
    { data: C; path?: string }
  >(
    endpoint,
    (url, { arg }) =>
      fetcher<R, C>({
        url: arg.path ? `${url}/${arg.path}` : url,
        method: 'POST',
        data: arg.data,
      }),
    {
      ...mutationConfig,
      onSuccess: () => revalidateExtraKeys(),
    },
  );

  const create = async (
    newItem: C,
    options?: MutationCallbacks<R>,
    path?: string,
  ) => {
    const tempId = `temp-${Math.random()}`;
    const tempItem = { ...(newItem as object), id: tempId } as R;
    const rollback = data;

    const promise = createTrigger({ data: newItem, path }).then((savedItem) => {
      mutate(
        (current) => ({
          ...current,
          items: current?.items?.map((i) => (i.id === tempId ? savedItem : i)),
        }),
        { revalidate: false },
      );
      options?.onSuccess?.(savedItem);
      return savedItem;
    });

    return await optimisticMutate(
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
    { id: EntityID; data: U; path?: string }
  >(
    endpoint,
    (_, { arg: { id, data, path } }) =>
      fetcher<R, U>({
        url: path ? `${endpoint}/${id}/${path}` : `${endpoint}/${id}`,
        method: 'PATCH',
        data,
      }),
    {
      ...mutationConfig,
      onSuccess: () => revalidateExtraKeys(),
    },
  );

  const update = async (
    id: EntityID,
    updates: U,
    options?: MutationCallbacks<R>,
    path?: string,
  ) => {
    const rollback = data;

    const promise = updateTrigger({ id, data: updates, path }).then(
      (updatedItem) => {
        options?.onSuccess?.(updatedItem);
        return updatedItem;
      },
    );

    return await optimisticMutate(
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
    { id: EntityID; path?: string }
  >(
    endpoint,
    (_, { arg: { id, path } }) =>
      fetcher<void>({
        url: path ? `${endpoint}/${id}/${path}` : `${endpoint}/${id}`,
        method: 'DELETE',
      }),
    {
      ...mutationConfig,
      onSuccess: () => revalidateExtraKeys(),
    },
  );

  const remove = async (
    id: EntityID,
    options?: MutationCallbacks<void>,
    path?: string,
  ) => {
    const rollback = data;

    const promise = deleteTrigger({ id, path }).then((data) => {
      options?.onSuccess?.();
      return data;
    });

    return await optimisticMutate(
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
