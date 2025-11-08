import { mutate as globalMutate } from 'swr';

import type { RevalidateKey } from './types';

const isValidKey = (key: unknown): key is string =>
  typeof key === 'string' && key.length > 0;

const isValidMatcher = (m: unknown): m is RevalidateKey =>
  typeof m === 'string' || m instanceof RegExp || typeof m === 'function';

export const revalidateExtraKeysFn = async (
  extraKeysToRevalidate: RevalidateKey[] = [],
) => {
  if (!extraKeysToRevalidate.length) return;

  await globalMutate((key) => {
    if (!isValidKey(key)) return false;
    const matchers = extraKeysToRevalidate.filter(isValidMatcher);

    return matchers.some((matcher) => {
      try {
        if (typeof matcher === 'string') return key.includes(matcher);
        if (matcher instanceof RegExp) return matcher.test(key);
        return matcher(key);
      } catch {
        return false;
      }
    });
  });
};
