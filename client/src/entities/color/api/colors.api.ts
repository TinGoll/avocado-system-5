import { Endpoints, useEntity, type ErrorResponse } from '@shared/lib/swr';

import type { Color } from '../model/types';
type Responce = {
  colors: Color[];
  map: Record<Color['id'], Color>;
  meta?: Record<string, unknown>;
  error?: ErrorResponse;
};
export const useColors = () =>
  useEntity<Color, Responce>({
    endpoint: Endpoints.COLORS,
    transform: ({ items, ...data }) => ({
      colors: items ?? [],
      map: Object.fromEntries(
        (items ?? []).map((item) => [item.id, item]),
      ) as Record<Color['id'], Color>,
      ...data,
    }),
  });

export const useColorMap = () => {
  const { isLoading, data } = useColors();
  return {
    map: data?.map,
    isLoading,
  };
};
