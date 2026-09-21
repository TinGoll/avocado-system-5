import type { Dayjs } from 'dayjs';

export const toManagementDate = (value: Dayjs | null): string | null =>
  value?.format('YYYY-MM-DD') ?? null;
