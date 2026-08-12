import useSWR from 'swr';

import { Endpoints, fetcher } from '@shared/lib/swr';

import type { PriceModifierConditionPathSchemas } from '../model/pathSchema';

export const useConditionPathSchemas = () =>
  useSWR<PriceModifierConditionPathSchemas>(
    `${Endpoints.PRICE_MODIFIERS}/condition-paths`,
    (url: string) => fetcher<PriceModifierConditionPathSchemas>({ url }),
  );
