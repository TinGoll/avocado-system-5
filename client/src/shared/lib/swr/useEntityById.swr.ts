import { useMemo } from 'react';
import type { SWRConfiguration } from 'swr';
import useSWR from 'swr';

import { fetcher } from './fetcher.swr';
import type { BaseEntity, EntityID } from './types';

export const useEntityById = <R extends BaseEntity>({
  endpoint,
  id,
  swrConfig,
  transform,
}: {
  endpoint: string;
  id?: EntityID;
  swrConfig?: SWRConfiguration;
  transform?: (data: R) => R;
}) => {
  const shouldFetch = Boolean(id);
  const { data, error, isLoading, mutate } = useSWR<R, Error>(
    shouldFetch ? `${endpoint}/${id}` : null,
    (url: string) => fetcher({ url }),
    swrConfig,
  );

  const transformedData = useMemo(
    () => (data && transform ? transform(data) : data),
    [data, transform],
  );

  return { data: transformedData, error, isLoading, mutate };
};
