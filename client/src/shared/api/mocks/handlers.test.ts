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

  it('creates a product template', async () => {
    const payload = {
      name: 'Тестовая номенклатура',
      group: 'Тест',
      defaultCharacteristics: { width: 600, height: 700 },
      customerPricingMethod: 'area',
      baseCustomerPrice: 5000,
      attributes: {},
    };
    const response = await fetch('http://localhost/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const created = (await response.json()) as typeof payload & { id: string };

    expect(response.status).toBe(201);
    expect(created).toMatchObject(payload);
    expect(created.id).toBeTruthy();
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

  it('adds an item to an order and returns it on the next request', async () => {
    const orderId = 'aa000000-0000-4000-8000-000000000001';
    const response = await fetch(`http://localhost/orders/${orderId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: '88000000-0000-4000-8000-000000000001',
        quantity: 2,
        characteristics: {
          width: 500,
          height: 700,
          comment: 'Тестовый фасад',
        },
      }),
    });
    const updatedOrder = (await response.json()) as {
      items: Record<string, unknown>[];
      totalPrice: number;
    };

    expect(response.status).toBe(201);
    expect(updatedOrder.items).toContainEqual(
      expect.objectContaining({
        quantity: 2,
        characteristics: expect.objectContaining({
          width: 500,
          height: 700,
          thickness: 20,
          comment: 'Тестовый фасад',
        }),
        calculatedCustomerPrice: 5950,
      }),
    );
    expect(updatedOrder.totalPrice).toBe(5950);

    const getResponse = await fetch(
      `http://localhost/orders/${orderId}/with-items`,
    );
    const persistedOrder = (await getResponse.json()) as {
      items: Record<string, unknown>[];
    };

    expect(persistedOrder.items).toEqual(updatedOrder.items);
  });
});
