import type { CustomerFinanceOrder } from '@shared/api';

import {
  allocationError,
  allocationTotal,
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
