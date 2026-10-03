import { OrderStatus } from '../order-groups/entities/order-group.entity';
import {
  CustomerOrderFinancialStatus,
  getCustomerOrderFinancialStatus,
  getMissingToHalfMinor,
  isAllocatableOrderStatus,
  isClosedOrderStatus,
} from './customer-finance';

describe('customer finance calculations', () => {
  it.each([
    [10_000, 0, CustomerOrderFinancialStatus.UNPAID],
    [10_000, 4_999, CustomerOrderFinancialStatus.PARTIALLY_PAID],
    [10_000, 5_000, CustomerOrderFinancialStatus.PREPAID],
    [10_000, 5_001, CustomerOrderFinancialStatus.PREPAID],
    [10_000, 10_000, CustomerOrderFinancialStatus.PAID],
    [0, 0, CustomerOrderFinancialStatus.PAID],
  ])('maps total %i and paid %i to %s', (totalMinor, paidMinor, expected) => {
    expect(getCustomerOrderFinancialStatus(totalMinor, paidMinor)).toBe(
      expected,
    );
  });

  it('rounds an odd half up to the next kopeck', () => {
    expect(getMissingToHalfMinor(101, 50)).toBe(1);
    expect(getCustomerOrderFinancialStatus(101, 50)).toBe(
      CustomerOrderFinancialStatus.PARTIALLY_PAID,
    );
    expect(getMissingToHalfMinor(101, 51)).toBe(0);
    expect(getCustomerOrderFinancialStatus(101, 51)).toBe(
      CustomerOrderFinancialStatus.PREPAID,
    );
  });

  it('uses stable lifecycle values for closed and allocatable states', () => {
    expect(isClosedOrderStatus(OrderStatus.COMPLETED)).toBe(true);
    expect(isClosedOrderStatus(OrderStatus.IN_PRODUCTION)).toBe(false);
    expect(isAllocatableOrderStatus(OrderStatus.DRAFT)).toBe(true);
    expect(isAllocatableOrderStatus(OrderStatus.IN_PRODUCTION)).toBe(true);
    expect(isAllocatableOrderStatus(OrderStatus.COMPLETED)).toBe(false);
    expect(isAllocatableOrderStatus(OrderStatus.CANCELLED)).toBe(false);
  });
});
