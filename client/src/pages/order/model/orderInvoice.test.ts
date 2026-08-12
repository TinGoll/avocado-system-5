import { formatCurrency, formatDimensions } from './orderInvoice';

describe('order invoice formatting', () => {
  it('formats dimensions in height, width and thickness order', () => {
    expect(formatDimensions(600, 720, 20)).toBe('720 × 600 × 20 мм');
  });

  it('keeps available dimensions and handles an empty value', () => {
    expect(formatDimensions(450, undefined, 20)).toBe('450 × 20 мм');
    expect(formatDimensions()).toBe('—');
  });

  it('formats a price as Russian rubles', () => {
    expect(formatCurrency(42800)).toMatch(/42[\s\u00a0]800/);
    expect(formatCurrency(42800)).toContain('₽');
  });
});
