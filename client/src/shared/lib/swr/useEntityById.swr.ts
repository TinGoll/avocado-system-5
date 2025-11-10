import { useMemo } from 'react';
import type { SWRConfiguration } from 'swr';
import useSWR from 'swr';

import { fetcher } from './fetcher.swr';
import type { EntityID } from './types';

// @typescript-eslint/no-explicit-any
export const useEntityById = <R>({
  endpoint,
  id,
  path = '',
  transform,
  swrConfig,
  onSuccess,
  onError,
}: {
  endpoint: string;
  id?: EntityID | null;
  path?: string;
  transform?: (data: R) => R;
  swrConfig?: SWRConfiguration<R, Error>;
  onSuccess?: (data: R) => void;
  onError?: (error: Error) => void;
}) => {
  const shouldFetch = Boolean(id);

  const url = useMemo(() => {
    if (!shouldFetch) return null;
    const cleanPath = path ? `/${path.replace(/^\/+/, '')}` : '';
    return `${endpoint}/${id}${cleanPath}`;
  }, [endpoint, id, path, shouldFetch]);

  const { data, error, isLoading, mutate } = useSWR<R, Error>(
    url,
    (url) => fetcher({ url }),
    {
      ...swrConfig,
      onSuccess: (data, key, config) => {
        onSuccess?.(data);
        swrConfig?.onSuccess?.(data, key, config);
      },
      onError: (error, key, config) => {
        onError?.(error);
        swrConfig?.onError?.(error, key, config);
      },
    },
  );

  const transformedData = useMemo(
    () => (data && transform ? transform(data) : data),
    [data, transform],
  );

  return { data: transformedData, error, isLoading, mutate };
};
