import type { SWRConfiguration } from 'swr';
import type { SWRMutationConfiguration } from 'swr/mutation';

import type { Endpoints } from './endpoints';

export type RevalidateKey = string | RegExp | ((key: string) => boolean);

export type EntityID = string | number;

export type ErrorResponse = {
  message: string;
  code?: string;
  details?: unknown;
};

export interface BaseEntity {
  id: EntityID;
}

export interface MutationCallbacks<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: Error) => void;
}

export interface PaginatedResponse<T> {
  items?: T[];
  meta?: Record<string, unknown>;
  error?: ErrorResponse;
}

export interface UseEntityOptions<
  R extends BaseEntity,
  TTransformedData = PaginatedResponse<R>,
> {
  endpoint: Endpoints | string;
  swrConfig?: SWRConfiguration<PaginatedResponse<R>>;
  transform?: (data: PaginatedResponse<R>) => TTransformedData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mutationConfig?: SWRMutationConfiguration<any, Error, string, any>;

  extraKeysToRevalidate?: RevalidateKey[];
  disabled?: boolean;
}
