import type { Order, OrderItem } from '@entities/order';
import {
  CUSTOMER_PRICING_METHOD,
  type CustomerPricingMethod,
} from '@shared/lib/swr';

export type CustomerOrderRow = {
  key: string;
  name: string;
  dimensions: string;
  calculatedQuantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  comment: string;
};

export type CustomerOrderTotal = {
  group: string;
  amount: number;
};

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const unitLabels: Record<CustomerPricingMethod, string> = {
  [CUSTOMER_PRICING_METHOD.PER_ITEM]: 'шт.',
  [CUSTOMER_PRICING_METHOD.LINEAR_METER]: 'п/м',
  [CUSTOMER_PRICING_METHOD.AREA]: 'м²',
  [CUSTOMER_PRICING_METHOD.VOLUME]: 'м³',
};

const calculateQuantity = (item: OrderItem): number => {
  const { width = 0, height = 0, thickness = 0 } = item.characteristics;
  const quantity = Number(item.quantity) || 0;

  switch (item.snapshot.customerPricingMethod) {
    case CUSTOMER_PRICING_METHOD.LINEAR_METER:
      return (Number(height) / 1000) * quantity;
    case CUSTOMER_PRICING_METHOD.AREA:
      return (Number(width) / 1000) * (Number(height) / 1000) * quantity;
    case CUSTOMER_PRICING_METHOD.VOLUME:
      return (
        (Number(width) / 1000) *
        (Number(height) / 1000) *
        (Number(thickness) / 1000) *
        quantity
      );
    case CUSTOMER_PRICING_METHOD.PER_ITEM:
    default:
      return quantity;
  }
};

const renderDisplayTemplate = (item: OrderItem, order: Order): string => {
  const template = item.template?.displayTemplate?.trim();

  if (!template) return '—';

  const values: Record<string, unknown> = {
    item: {
      name: item.snapshot?.name ?? item.template?.name,
      ...item.characteristics,
      quantity: item.quantity,
    },
    ...order.characteristics,
  };

  return template.replace(
    /{{\s*([^{}]+?)\s*}}/g,
    (placeholder, path: string) => {
      const value = path
        .trim()
        .split('.')
        .reduce<unknown>(
          (current, segment) =>
            typeof current === 'object' && current !== null
              ? (current as Record<string, unknown>)[segment]
              : undefined,
          values,
        );

      return value === undefined || value === null
        ? placeholder
        : String(value);
    },
  );
};

export const buildCustomerOrderRows = (order: Order): CustomerOrderRow[] =>
  order.items.map((item) => {
    const calculatedQuantity = calculateQuantity(item);

    return {
      key: item.id,
      name: item.snapshot?.name || item.template?.name || '—',
      dimensions: renderDisplayTemplate(item, order),
      calculatedQuantity,
      unit: unitLabels[item.snapshot.customerPricingMethod],
      unitPrice: roundMoney(
        calculatedQuantity > 0
          ? item.calculatedCustomerPrice / calculatedQuantity
          : item.calculatedCustomerPrice,
      ),
      totalPrice: roundMoney(item.calculatedCustomerPrice),
      comment: item.characteristics.comment || '',
    };
  });

export const buildCustomerOrderTotals = (
  order: Order,
): { groups: CustomerOrderTotal[]; total: number } => {
  const totalsByGroup = new Map<string, number>();

  order.items.forEach((item) => {
    const group = item.template?.group?.trim() || 'Без группы';
    totalsByGroup.set(
      group,
      (totalsByGroup.get(group) ?? 0) + item.calculatedCustomerPrice,
    );
  });

  const groups = [...totalsByGroup].map(([group, amount]) => ({
    group,
    amount: roundMoney(amount),
  }));

  return {
    groups,
    total: roundMoney(groups.reduce((sum, { amount }) => sum + amount, 0)),
  };
};
