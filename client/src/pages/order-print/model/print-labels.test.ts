import { describe, expect, it } from 'vitest';

import { getOrderPrintLabels } from './print-labels';

describe('getOrderPrintLabels', () => {
  it('combines group and document labels without duplicates', () => {
    const shared = { id: 'shared', name: 'Срочно', color: '#ff0000' };

    expect(
      getOrderPrintLabels(
        [shared],
        [shared, { id: 'document', name: 'Проверить', color: '#0000ff' }],
      ),
    ).toEqual([
      shared,
      { id: 'document', name: 'Проверить', color: '#0000ff' },
    ]);
  });
});
