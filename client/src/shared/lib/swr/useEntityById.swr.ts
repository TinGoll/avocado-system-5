import { useMemo } from 'react';
import type { SWRConfiguration } from 'swr';
import useSWR from 'swr';

import { fetcher } from './fetcher.swr';
import type { BaseEntity, EntityID } from './types';
export const useEntityById = <R extends BaseEntity>({
  endpoint,
  id,
  path = '',
  swrConfig,
  transform,
}: {
  endpoint: string;
  id?: EntityID | null;
  path?: string;
  swrConfig?: SWRConfiguration;
  transform?: (data: R) => R;
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
    swrConfig,
  );

  const transformedData = useMemo(
    () => (data && transform ? transform(data) : data),
    [data, transform],
  );

  return { data: transformedData, error, isLoading, mutate };
};
