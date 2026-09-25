import {
  FinanceRequestAttempt,
  calculatePaymentTotals,
  minorToRubles,
  rublesToMinor,
} from './finance-attempt';

describe('finance attempts', () => {
  it('keeps requestId for a retry and rotates it only after payload change', () => {
    const attempt = new FinanceRequestAttempt();
    const first = attempt.current();

    expect(attempt.current()).toBe(first);
    expect(attempt.changePayload()).not.toBe(first);
    expect(attempt.current()).not.toBe(first);
  });

  it('calculates allocation and advance values in integer minor units', () => {
    expect(rublesToMinor('150000.25')).toBe(15_000_025);
    expect(rublesToMinor('invalid')).toBe(0);
    expect(minorToRubles(20_005)).toBe('200.05');
  });

  it.each([
    ['advance without allocations', '100.00', [], 0, 10_000],
    ['partial allocation', '100.00', [{ amount: '25.00' }], 2_500, 7_500],
    [
      'one payment for several accruals',
      '100.00',
      [{ amount: '25.00' }, { amount: '75.00' }],
      10_000,
      0,
    ],
  ])(
    'calculates %s',
    (_, amount, allocations, allocatedMinor, advanceMinor) => {
      expect(calculatePaymentTotals(amount, allocations)).toEqual({
        amountMinor: 10_000,
        allocatedMinor,
        advanceMinor,
      });
    },
  );
});
