import { formatMinorToRubles, parseRublesToMinor } from './finance-money';

describe('finance money', () => {
  it.each([
    ['0.01', 1],
    ['15', 1500],
    ['15.2', 1520],
    ['15.20', 1520],
  ])('parses %s rubles into minor units', (value, expected) => {
    expect(parseRublesToMinor(value)).toBe(expected);
  });

  it('allows a negative non-zero adjustment only when requested', () => {
    expect(parseRublesToMinor('-12.34', { allowNegative: true })).toBe(-1234);
    expect(() => parseRublesToMinor('-12.34')).toThrow(RangeError);
  });

  it.each(['1.234', '01.00', '1,20', '', ' 1.00 '])(
    'rejects invalid precision or syntax: %s',
    (value) => {
      expect(() => parseRublesToMinor(value)).toThrow(RangeError);
    },
  );

  it('rejects zero unless explicitly allowed', () => {
    expect(() => parseRublesToMinor('0')).toThrow(RangeError);
    expect(parseRublesToMinor('0.00', { allowZero: true })).toBe(0);
  });

  it('accepts the largest safe whole amount and rejects overflow', () => {
    expect(parseRublesToMinor('90071992547409.91')).toBe(
      Number.MAX_SAFE_INTEGER,
    );
    expect(() => parseRublesToMinor('90071992547409.92')).toThrow(RangeError);
  });

  it('formats safe minor units for an API response', () => {
    expect(formatMinorToRubles(1)).toBe('0.01');
    expect(formatMinorToRubles(1500)).toBe('15.00');
    expect(formatMinorToRubles(-1234)).toBe('-12.34');
    expect(() => formatMinorToRubles(Number.MAX_SAFE_INTEGER + 1)).toThrow(
      RangeError,
    );
  });
});
