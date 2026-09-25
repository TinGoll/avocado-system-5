export class FinanceRequestAttempt {
  private requestId = crypto.randomUUID();

  current() {
    return this.requestId;
  }

  changePayload() {
    this.requestId = crypto.randomUUID();
    return this.requestId;
  }
}

export const rublesToMinor = (value?: string) => {
  if (!value || !/^\d+(?:\.\d{1,2})?$/.test(value)) return 0;
  const [rubles, kopecks = ''] = value.split('.');
  return Number(rubles) * 100 + Number(kopecks.padEnd(2, '0'));
};

export const minorToRubles = (value: number) =>
  `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`;

export const calculatePaymentTotals = (
  amount: string | undefined,
  allocations: Array<{ amount?: string }> = [],
) => {
  const amountMinor = rublesToMinor(amount);
  const allocatedMinor = allocations.reduce(
    (sum, allocation) => sum + rublesToMinor(allocation.amount),
    0,
  );
  return {
    amountMinor,
    allocatedMinor,
    advanceMinor: Math.max(amountMinor - allocatedMinor, 0),
  };
};
