import { setupServer } from 'msw/node';

import { handlers } from './handlers';

const server = setupServer(...handlers);

describe('MSW API mocks', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterAll(() => server.close());

  it('returns seeded collections', async () => {
    const response = await fetch('http://localhost/colors');
    const body = (await response.json()) as { items: unknown[] };

    expect(response.ok).toBe(true);
    expect(body.items).toHaveLength(2);
  });

  it('returns customers from GET /api/customers', async () => {
    const response = await fetch('http://localhost/api/customers');
    const body = (await response.json()) as {
      items: { id: string; name: string; level: string }[];
    };

    expect(response.ok).toBe(true);
    expect(body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'customer-1',
          name: 'Иван Петров',
          level: 'gold',
        }),
      ]),
    );
  });

  it('persists created entities in memory', async () => {
    const createResponse = await fetch('http://localhost/patinas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Бронза' }),
    });
    const created = (await createResponse.json()) as { id: string };

    const getResponse = await fetch(`http://localhost/patinas/${created.id}`);
    const entity = (await getResponse.json()) as { name: string };

    expect(createResponse.status).toBe(201);
    expect(entity.name).toBe('Бронза');
  });

  it('returns order ids for a group', async () => {
    const response = await fetch('http://localhost/order-groups/1/order-ids');
    const body = (await response.json()) as { items: { id: string }[] };

    expect(body.items).toEqual([
      { id: 'aa000000-0000-4000-8000-000000000001', name: 'Документ 1' },
    ]);
  });

  it('returns an order group with multiple documents', async () => {
    const response = await fetch('http://localhost/order-groups');
    const body = (await response.json()) as {
      items: { id: number; orders: { id: string }[] }[];
    };

    const group = body.items.find(({ id }) => id === 2);

    expect(group?.orders).toHaveLength(3);
  });
});
