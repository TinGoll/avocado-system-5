import {
  CUSTOMER_PRICING_METHOD,
  type CustomerPricingMethod,
} from '@shared/lib/swr';

export const pricingMethodLabels: Record<CustomerPricingMethod, string> = {
  [CUSTOMER_PRICING_METHOD.PER_ITEM]: 'шт.',
  [CUSTOMER_PRICING_METHOD.LINEAR_METER]: 'пог. м',
  [CUSTOMER_PRICING_METHOD.AREA]: 'м²',
  [CUSTOMER_PRICING_METHOD.VOLUME]: 'м³',
};

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

export const formatDimensions = (
  width?: number,
  height?: number,
  thickness?: number,
): string => {
  const dimensions = [height, width, thickness].filter(
    (value): value is number => value !== undefined && value !== null,
  );

  return dimensions.length > 0 ? `${dimensions.join(' × ')} мм` : '—';
};
