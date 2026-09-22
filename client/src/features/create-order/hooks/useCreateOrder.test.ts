import { describe, expect, it } from 'vitest';

import { createOrderGroupPayload } from './useCreateOrder';

describe('createOrderGroupPayload', () => {
  it('sends the customer id and never sends a customer object', () => {
    const payload = createOrderGroupPayload({
      orderNumber: 'ORDER-1',
      customerId: '11111111-1111-4111-8111-111111111111',
      characteristics: {},
    });

    expect(payload).toEqual({
      orderNumber: 'ORDER-1',
      customerId: '11111111-1111-4111-8111-111111111111',
      startedAt: undefined,
      comment: undefined,
    });
    expect(payload).not.toHaveProperty('customer');
  });
});
