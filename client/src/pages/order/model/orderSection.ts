export const ORDER_SECTION = 'order';
export const PRODUCTION_SECTION = 'production';
export const FINANCE_SECTION = 'finance';

export type OrderSection =
  | typeof ORDER_SECTION
  | typeof PRODUCTION_SECTION
  | typeof FINANCE_SECTION;

export const getOrderSection = (
  source: URLSearchParams | string | null,
): OrderSection => {
  const value = source instanceof URLSearchParams ? source.get('tab') : source;

  if (value === PRODUCTION_SECTION || value === FINANCE_SECTION) {
    return value;
  }

  return ORDER_SECTION;
};

export const setOrderSection = (
  searchParams: URLSearchParams,
  section: OrderSection,
): URLSearchParams => {
  const nextSearchParams = new URLSearchParams(searchParams);
  nextSearchParams.set('tab', section);
  return nextSearchParams;
};
