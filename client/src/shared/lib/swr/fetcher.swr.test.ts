import { describe, expect, it } from 'vitest';

import { resolveApiBaseUrl } from './fetcher.swr';

describe('resolveApiBaseUrl', () => {
  it.each([
    [undefined, '/api'],
    ['', '/api'],
    ['http://localhost:3000', 'http://localhost:3000/api'],
    ['http://localhost:3000/', 'http://localhost:3000/api'],
    ['http://localhost:3000/api', 'http://localhost:3000/api'],
    ['/api/', '/api'],
  ])('resolves %s to %s', (configuredBaseUrl, expected) => {
    expect(resolveApiBaseUrl(configuredBaseUrl)).toBe(expected);
  });

  it('uses the API URL exposed by the Electron preload', () => {
    Object.defineProperty(window, 'avocadoDesktop', {
      configurable: true,
      value: { apiBaseUrl: 'http://127.0.0.1:43210/' },
    });

    expect(resolveApiBaseUrl()).toBe('http://127.0.0.1:43210/api');
    expect(resolveApiBaseUrl('https://api.example.com')).toBe(
      'http://127.0.0.1:43210/api',
    );

    Reflect.deleteProperty(window, 'avocadoDesktop');
  });
});
