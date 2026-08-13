import { resolveApiBaseUrl } from '@shared/lib/swr/fetcher.swr';

export interface ClientErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
}

export const reportClientError = (report: ClientErrorReport): void => {
  try {
    const endpoint = `${resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL)}/client-errors`;
    const body = JSON.stringify(report);

    if (
      navigator.sendBeacon?.(
        endpoint,
        new Blob([body], { type: 'application/json' }),
      )
    ) {
      return;
    }

    void fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Reporting must never replace the original application error.
  }
};
