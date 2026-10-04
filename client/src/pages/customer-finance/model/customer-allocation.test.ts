import type { CustomerFinanceOrder } from '@shared/api';

import {
  allocationError,
  allocationTotal,
  autoAllocate,
  fillFullDebt,
  fillToHalf,
  formatMinor,
  isPartialFullPayment,
  parseRublesToMinor,
  parseSignedRublesToMinor,
} from './customer-allocation';

const order = {
  id: 1,
  debt: '80.01',
  missingToHalf: '30.01',
} as CustomerFinanceOrder;

describe('customer allocation money', () => {
  it.each([
    ['', 0],
    ['0', 0],
    ['12', 1_200],
    ['12.3', 1_230],
    ['12,34', 1_234],
    ['0.01', 1],
  ])('parses %s without floating point arithmetic', (value, expected) => {
    expect(parseRublesToMinor(value)).toBe(expected);
  });

  it.each(['-1', '1.234', '1e2', 'рубль'])(
    'rejects invalid value %s',
    (value) => {
      expect(parseRublesToMinor(value)).toBeNull();
    },
  );

  it('calculates totals, remaining balance and quick actions in kopecks', () => {
    expect(allocationTotal({ 2: '10.01', 3: '2.02' })).toBe(1_203);
    expect(fillToHalf(order)).toBe('30.01');
    expect(fillFullDebt(order, 5_000, { 2: '10.00' })).toBe('40.00');
    expect(formatMinor(-101)).toBe('-1.01');
    expect(parseSignedRublesToMinor('-12.34')).toBe(-1_234);
  });

  it('validates debt and marks a balance-limited full payment as partial', () => {
    expect(allocationError('80.02', 8_001)).toContain('долг');
    expect(isPartialFullPayment(order, '40.00')).toBe(true);
    expect(isPartialFullPayment(order, '80.01')).toBe(false);
  });
});

const allocationOrder = (
  id: number,
  options: Partial<CustomerFinanceOrder> = {},
): CustomerFinanceOrder => ({
  id,
  name: `Заказ ${id}`,
  orderNumber: String(id),
  createdAt: `2026-09-${String(id).padStart(2, '0')}T10:00:00.000Z`,
  systemStatus: 'in_production',
  closed: false,
  allocationAvailable: true,
  accrualId: `accrual-${id}`,
  accrualStatus: 'active',
  total: '100.00',
  paid: '0.00',
  debt: '100.00',
  missingToHalf: '50.00',
  financialStatus: 'unpaid',
  ...options,
});

describe('customer allocation auto-fill', () => {
  it('fully pays several working orders oldest first', () => {
    const result = autoAllocate(
      [allocationOrder(2), allocationOrder(1)],
      20_000,
    );
    expect(result.values).toEqual({ 1: '100.00', 2: '100.00' });
    expect(result.remainderMinor).toBe(0);
  });

  it('uses the whole balance for a partial payment of the first working order', () => {
    const result = autoAllocate(
      [allocationOrder(1), allocationOrder(2)],
      4_001,
    );
    expect(result.values).toEqual({ 1: '40.01' });
    expect(result.reasons[1]).toBe('Погашение заказа в работе');
  });

  it('uses the remainder for prepayments after working orders', () => {
    const result = autoAllocate(
      [
        allocationOrder(1, { debt: '40.00' }),
        allocationOrder(2, { systemStatus: 'draft' }),
      ],
      7_000,
    );
    expect(result.values).toEqual({ 1: '40.00', 2: '30.00' });
    expect(result.reasons[2]).toBe('Предоплата до 50%');
  });

  it('stops between prepayment orders when the balance runs out', () => {
    const result = autoAllocate(
      [
        allocationOrder(1, { systemStatus: 'draft', missingToHalf: '30.00' }),
        allocationOrder(2, { systemStatus: 'draft', missingToHalf: '30.00' }),
      ],
      4_500,
    );
    expect(result.values).toEqual({ 1: '30.00', 2: '15.00' });
  });

  it('leaves money unallocated after all goals are reached', () => {
    const result = autoAllocate(
      [allocationOrder(1, { systemStatus: 'draft', missingToHalf: '10.00' })],
      5_000,
    );
    expect(result.values).toEqual({ 1: '10.00' });
    expect(result.remainderMinor).toBe(4_000);
  });

  it('skips closed and fully paid orders', () => {
    const result = autoAllocate(
      [
        allocationOrder(1, { closed: true }),
        allocationOrder(2, { financialStatus: 'paid', debt: '0.00' }),
        allocationOrder(3),
      ],
      10_000,
    );
    expect(result.values).toEqual({ 3: '100.00' });
  });

  it('uses the id as a deterministic tie breaker for equal dates', () => {
    const date = '2026-09-01T10:00:00.000Z';
    const result = autoAllocate(
      [
        allocationOrder(2, { createdAt: date }),
        allocationOrder(1, { createdAt: date }),
      ],
      10_000,
    );
    expect(result.values).toEqual({ 1: '100.00' });
  });
});
