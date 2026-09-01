import type { AxiosError } from 'axios';

import { fetcher } from '@shared/lib/swr';

export type PreviewField =
  | 'calculationFormula'
  | 'displayNameTemplate'
  | 'context';

export type ProductionOperationPreview = {
  calculatedQuantity: number;
  calculatedCost: number;
  renderedName: string;
  calculatedWidth?: number;
  calculatedHeight?: number;
  calculatedThickness?: number | null;
  panelWidth?: number;
  panelHeight?: number;
};

export type PreviewErrorDetails = {
  field?: PreviewField;
  message?: string;
};

export const previewProductionOperation = (data: {
  calculationFormula: string;
  displayNameTemplate: string;
  costPerUnit: number;
  item: {
    name?: string;
    width?: number;
    height?: number;
    thickness?: number;
    quantity: number;
  };
  orderCharacteristics?: {
    profile?: {
      name?: string;
      characteristics: { width?: number; grooveDepth?: number };
    };
    panel?: { name?: string };
  };
}) =>
  fetcher<ProductionOperationPreview>({
    url: 'production-operations/preview',
    method: 'POST',
    data,
  });

export const getPreviewError = (error: unknown): PreviewErrorDetails => {
  const response = (
    error as AxiosError<{
      error?: { details?: PreviewErrorDetails };
    }>
  ).response?.data;
  return response?.error?.details ?? {};
};
