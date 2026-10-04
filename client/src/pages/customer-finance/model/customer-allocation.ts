import type { CustomerFinanceOrder } from '@shared/api';

export type AllocationValues = Record<number, string>;
export type AllocationReasons = Record<number, AllocationReason>;
export type AllocationReason =
  | 'Погашение заказа в работе'
  | 'Предоплата до 50%';

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

const orderSequence = (
  left: CustomerFinanceOrder,
  right: CustomerFinanceOrder,
) =>
  new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime() ||
  left.id - right.id;

export const autoAllocate = (
  orders: CustomerFinanceOrder[],
  balanceMinor: number,
): {
  values: AllocationValues;
  reasons: AllocationReasons;
  remainderMinor: number;
} => {
  const values: AllocationValues = {};
  const reasons: AllocationReasons = {};
  let remainderMinor = Math.max(balanceMinor, 0);
  const eligible = orders
    .filter(
      (order) =>
        !order.closed &&
        order.allocationAvailable &&
        order.financialStatus !== 'paid',
    )
    .sort(orderSequence);

  const allocate = (
    order: CustomerFinanceOrder,
    targetMinor: number,
    reason: AllocationReason,
  ) => {
    const amountMinor = Math.min(Math.max(targetMinor, 0), remainderMinor);
    if (amountMinor <= 0) return;
    values[order.id] = formatMinor(amountMinor);
    reasons[order.id] = reason;
    remainderMinor -= amountMinor;
  };

  const working = eligible.filter(
    (order) => order.systemStatus === 'in_production',
  );
  for (const order of working) {
    allocate(
      order,
      parseRublesToMinor(order.debt) ?? 0,
      'Погашение заказа в работе',
    );
    if (remainderMinor === 0) return { values, reasons, remainderMinor };
  }

  for (const order of eligible.filter(
    (item) => item.systemStatus !== 'in_production',
  )) {
    allocate(
      order,
      parseRublesToMinor(order.missingToHalf) ?? 0,
      'Предоплата до 50%',
    );
    if (remainderMinor === 0) break;
  }
  return { values, reasons, remainderMinor };
};

export const hasAllocationErrors = (
  orders: CustomerFinanceOrder[],
  values: AllocationValues,
  balanceMinor: number,
) =>
  allocationTotal(values) > Math.max(balanceMinor, 0) ||
  orders.some((order) => {
    const value = values[order.id] ?? '';
    return Boolean(
      value && allocationError(value, parseRublesToMinor(order.debt) ?? 0),
    );
  });
