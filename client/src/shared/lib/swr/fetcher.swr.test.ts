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
});
