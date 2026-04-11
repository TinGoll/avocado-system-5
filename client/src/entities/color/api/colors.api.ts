import { useMemo } from 'react';

import { Endpoints, useEntity, type PaginatedResponse } from '@shared/lib/swr';
import { transformEntityResponse } from '@shared/lib/swr/utils';

import type { Color } from '../model/color';

const transformColors = (data: PaginatedResponse<Color>) =>
  transformEntityResponse(data, 'colors');

export const useColors = () =>
  useEntity<Color, ReturnType<typeof transformColors>>({
    endpoint: Endpoints.COLORS,
    transform: transformColors,
  });

export const useColorMap = () => {
  const { isLoading, data } = useColors();

  return useMemo(
    () => ({
      map: data?.map,
      isLoading,
    }),
    [data?.map, isLoading],
  );
};
