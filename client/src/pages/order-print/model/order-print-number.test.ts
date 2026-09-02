import { describe, expect, it } from 'vitest';

import { formatOrderPrintNumber } from './order-print-number';

describe('formatOrderPrintNumber', () => {
  it('renders only the group number for a single document', () => {
    expect(formatOrderPrintNumber(7, 2, 1)).toBe('№ 7');
  });

  it('renders the document number and total for multiple documents', () => {
    expect(formatOrderPrintNumber(7, 2, 3)).toBe('№ 7/2 (3)');
  });
});
