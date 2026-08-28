import type { AxiosError } from 'axios';
import useSWR from 'swr';

import { fetcher } from '@shared/lib/swr';

export type ProductOutputVariable = {
  path: string;
  label: string;
  description: string;
  valueType: 'string' | 'number' | 'boolean';
  unit?: string;
  optional?: boolean;
};

export const useProductOutputVariables = () =>
  useSWR('product-output-template-variables', () =>
    fetcher<{ variables: ProductOutputVariable[] }>({
      url: 'template-variables',
      params: { scope: 'product-output' },
    }).then(({ variables }) => variables),
  );

export const previewProductDisplayTemplate = (data: unknown) =>
  fetcher<{ renderedValue: string }>({
    url: 'products/display-template/preview',
    method: 'POST',
    data,
  });

export const getProductTemplateError = (error: unknown) =>
  (
    error as AxiosError<{
      error?: { details?: { field?: string; message?: string } };
    }>
  ).response?.data.error?.details;
