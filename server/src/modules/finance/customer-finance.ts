import { OrderStatus } from '../order-groups/entities/order-group.entity';
import { assertSafeMinorAmount } from './finance-money';

export enum CustomerOrderFinancialStatus {
  UNPAID = 'unpaid',
  PARTIALLY_PAID = 'partially_paid',
  PREPAID = 'prepaid',
  PAID = 'paid',
}

export function getCustomerOrderFinancialStatus(
  totalMinor: number,
  paidMinor: number,
): CustomerOrderFinancialStatus {
  assertSafeMinorAmount(totalMinor);
  assertSafeMinorAmount(paidMinor);

  if (totalMinor <= 0 || paidMinor >= totalMinor) {
    return CustomerOrderFinancialStatus.PAID;
  }
  if (paidMinor <= 0) return CustomerOrderFinancialStatus.UNPAID;
  return paidMinor * 2 < totalMinor
    ? CustomerOrderFinancialStatus.PARTIALLY_PAID
    : CustomerOrderFinancialStatus.PREPAID;
}

export function getMissingToHalfMinor(
  totalMinor: number,
  paidMinor: number,
): number {
  assertSafeMinorAmount(totalMinor);
  assertSafeMinorAmount(paidMinor);
  return Math.max(Math.ceil(totalMinor / 2) - paidMinor, 0);
}

export function isClosedOrderStatus(status: OrderStatus): boolean {
  return status === OrderStatus.COMPLETED;
}

export function isAllocatableOrderStatus(status: OrderStatus): boolean {
  return status === OrderStatus.DRAFT || status === OrderStatus.IN_PRODUCTION;
}
