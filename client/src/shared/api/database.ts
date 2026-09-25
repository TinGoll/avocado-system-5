import { fetcher } from '@shared/lib/swr';

export const resetDatabase = (confirmation: string) =>
  fetcher<{ success: true }, { confirmation: string }>({
    url: 'database/reset',
    method: 'POST',
    data: { confirmation },
  });
