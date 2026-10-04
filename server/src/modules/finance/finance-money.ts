export type ParseRublesOptions = {
  allowNegative?: boolean;
  allowZero?: boolean;
};

const RUBLES_PATTERN = /^(-?)(0|[1-9]\d*)(?:\.(\d{1,2}))?$/;

export function parseRublesToMinor(
  value: string,
  options: ParseRublesOptions = {},
): number {
  const match = RUBLES_PATTERN.exec(value);
  if (!match) {
    throw new RangeError(
      'Money must be a decimal ruble string with no more than two decimal places.',
    );
  }

  const negative = match[1] === '-';
  if (negative && !options.allowNegative) {
    throw new RangeError('Money must not be negative in this context.');
  }

  const rubles = Number(match[2]);
  const kopecks = Number((match[3] ?? '').padEnd(2, '0'));
  const amountMinor = rubles * 100 + kopecks;
  const signedAmount = negative ? -amountMinor : amountMinor;

  assertSafeMinorAmount(signedAmount);
  if (signedAmount === 0 && !options.allowZero) {
    throw new RangeError('Money must not be zero in this context.');
  }
  return signedAmount;
}

export function formatMinorToRubles(amountMinor: number): string {
  assertSafeMinorAmount(amountMinor);
  const sign = amountMinor < 0 ? '-' : '';
  const absolute = Math.abs(amountMinor);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}

export function assertSafeMinorAmount(value: number): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError('Money in minor units must be a safe integer.');
  }
}
