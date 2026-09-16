export const ORDER_SECTION = 'order';
export const PRODUCTION_SECTION = 'production';

export type OrderSection = typeof ORDER_SECTION | typeof PRODUCTION_SECTION;

export const getOrderSection = (
  source: URLSearchParams | string | null,
): OrderSection => {
  const value = source instanceof URLSearchParams ? source.get('tab') : source;

  return value === PRODUCTION_SECTION ? PRODUCTION_SECTION : ORDER_SECTION;
};

export const setOrderSection = (
  searchParams: URLSearchParams,
  section: OrderSection,
): URLSearchParams => {
  const nextSearchParams = new URLSearchParams(searchParams);
  nextSearchParams.set('tab', section);
  return nextSearchParams;
};
