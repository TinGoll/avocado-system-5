import dayjs from 'dayjs';

import { toManagementDate } from './management-date';

describe('toManagementDate', () => {
  it('serializes a calendar date without a UTC conversion', () => {
    expect(toManagementDate(dayjs('2026-09-10'))).toBe('2026-09-10');
  });

  it('uses null to clear an override', () => {
    expect(toManagementDate(null)).toBeNull();
  });
});
