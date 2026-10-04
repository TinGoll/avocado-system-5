import type { CustomerFinanceOrder } from '@shared/api';

export type AllocationValues = Record<number, string>;

const parseMoney = (value: string, allowNegative: boolean): number | null => {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return 0;
  const pattern = allowNegative
    ? /^-?\d+(?:\.\d{0,2})?$/
    : /^\d+(?:\.\d{0,2})?$/;
  if (!pattern.test(normalized)) return null;
  const negative = normalized.startsWith('-');
  const [rubles, kopecks = ''] = normalized.replace('-', '').split('.');
  const absolute = Number(rubles) * 100 + Number(kopecks.padEnd(2, '0'));
  const minor = negative ? -absolute : absolute;
  return Number.isSafeInteger(minor) ? minor : null;
};

export const parseRublesToMinor = (value: string): number | null =>
  parseMoney(value, false);

export const parseSignedRublesToMinor = (value: string): number | null =>
  parseMoney(value, true);

export const formatMinor = (minor: number) => {
  const absolute = Math.abs(minor);
  const sign = minor < 0 ? '-' : '';
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
};

export const allocationTotal = (values: AllocationValues) =>
  Object.values(values).reduce((sum, value) => {
    const minor = parseRublesToMinor(value);
    return sum + (minor ?? 0);
  }, 0);

export const allocationError = (
  value: string,
  debtMinor: number,
): string | null => {
  const minor = parseRublesToMinor(value);
  if (minor === null) return 'Введите сумму с точностью не более двух знаков';
  if (minor > debtMinor) return 'Сумма не может превышать долг заказа';
  return null;
};

export const remainingForOrder = (
  balanceMinor: number,
  values: AllocationValues,
  orderId: number,
) => {
  const current = parseRublesToMinor(values[orderId] ?? '') ?? 0;
  return Math.max(balanceMinor - (allocationTotal(values) - current), 0);
};

export const fillToHalf = (order: CustomerFinanceOrder) =>
  formatMinor(parseRublesToMinor(order.missingToHalf) ?? 0);

export const fillFullDebt = (
  order: CustomerFinanceOrder,
  balanceMinor: number,
  values: AllocationValues,
) => {
  const debtMinor = parseRublesToMinor(order.debt) ?? 0;
  return formatMinor(
    Math.min(debtMinor, remainingForOrder(balanceMinor, values, order.id)),
  );
};

export const isPartialFullPayment = (
  order: CustomerFinanceOrder,
  value: string,
) => {
  const amountMinor = parseRublesToMinor(value) ?? 0;
  const debtMinor = parseRublesToMinor(order.debt) ?? 0;
  return amountMinor > 0 && amountMinor < debtMinor;
};
