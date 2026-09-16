import { describe, expect, it } from 'vitest';

import {
  getOrderSection,
  ORDER_SECTION,
  PRODUCTION_SECTION,
  setOrderSection,
} from './orderSection';

describe('order section URL state', () => {
  it.each([null, '', 'unknown'])('uses the order section for %s', (section) => {
    expect(getOrderSection(section)).toBe(ORDER_SECTION);
  });

  it('reads the production section from search params', () => {
    expect(getOrderSection(new URLSearchParams('tab=production'))).toBe(
      PRODUCTION_SECTION,
    );
  });

  it('changes the section without dropping the selected document', () => {
    const searchParams = setOrderSection(
      new URLSearchParams('document=2'),
      PRODUCTION_SECTION,
    );

    expect(searchParams.toString()).toBe('document=2&tab=production');
  });
});
