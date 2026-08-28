import { setupServer } from 'msw/node';

import { handlers, isFrontendAssetRequest } from './handlers';

const server = setupServer(...handlers);

describe('MSW API mocks', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterAll(() => server.close());

  it('does not treat Vite modules as API entities', () => {
    expect(
      isFrontendAssetRequest(
        new Request('http://localhost:5173/src/pages/price-modifiers/index.ts'),
      ),
    ).toBe(true);
    expect(
      isFrontendAssetRequest(
        new Request('http://localhost:5173/price-modifiers/modifier-1'),
      ),
    ).toBe(false);
  });

  it('returns seeded collections', async () => {
    const response = await fetch('http://localhost/colors');
    const body = (await response.json()) as { items: unknown[] };

    expect(response.ok).toBe(true);
    expect(body.items).toHaveLength(2);
  });

  it('returns condition path schemas for the modifier form', async () => {
    const response = await fetch(
      'http://localhost/price-modifiers/condition-paths',
    );
    const schemas = (await response.json()) as {
      order_group: { customer: { children: { level: unknown } } };
      order: unknown;
      item: { quantity: { type: string } };
    };

    expect(response.ok).toBe(true);
    expect(schemas.order_group.customer.children.level).toBeDefined();
    expect(schemas.order).toBeDefined();
    expect(schemas.item.quantity.type).toBe('number');
  });

  it('returns template variables filtered by scope', async () => {
    const response = await fetch(
      'http://localhost/template-variables?scope=production-operation-formula',
    );
    const body = (await response.json()) as {
      variables: { path: string; valueType: string }[];
    };

    expect(response.ok).toBe(true);
    expect(body.variables).toEqual([
      expect.objectContaining({ path: 'item.quantity', valueType: 'number' }),
    ]);
  });

  it('creates a global price modifier', async () => {
    const response = await fetch('http://localhost/price-modifiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Глобальная наценка',
        type: 'percentage',
        value: 5,
        priority: 10,
        conditions: {
          source: 'order_group',
          path: 'status',
          operator: 'eq',
          value: 'draft',
        },
        productTemplateIds: [],
      }),
    });
    const modifier = (await response.json()) as {
      id: string;
      productTemplates: unknown[];
      productTemplateIds?: string[];
    };

    expect(response.status).toBe(201);
    expect(modifier.productTemplates).toEqual([]);
    expect(modifier.productTemplateIds).toBeUndefined();

    await fetch(`http://localhost/price-modifiers/${modifier.id}`, {
      method: 'DELETE',
    });
  });

  it('creates and edits a price modifier scoped to product templates', async () => {
    const templateId = '88000000-0000-4000-8000-000000000001';
    const createResponse = await fetch('http://localhost/price-modifiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Наценка на фасады',
        type: 'fixed_amount',
        value: 500,
        priority: 2,
        conditions: {
          AND: [
            {
              source: 'item',
              path: 'quantity',
              operator: 'gte',
              value: 2,
            },
          ],
        },
        productTemplateIds: [templateId],
      }),
    });
    const created = (await createResponse.json()) as {
      id: string;
      productTemplates: { id: string; name: string }[];
    };

    expect(created.productTemplates).toEqual([
      expect.objectContaining({ id: templateId, name: 'Фасад прямой' }),
    ]);

    const updateResponse = await fetch(
      `http://localhost/price-modifiers/${created.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priority: 1,
          productTemplateIds: [],
        }),
      },
    );
    const updated = (await updateResponse.json()) as {
      priority: number;
      productTemplates: unknown[];
    };

    expect(updated.priority).toBe(1);
    expect(updated.productTemplates).toEqual([]);

    const deleteResponse = await fetch(
      `http://localhost/price-modifiers/${created.id}`,
      { method: 'DELETE' },
    );
    expect(deleteResponse.ok).toBe(true);
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
    const priceModifierId = '99000000-0000-4000-8000-000000000002';
    const productPayload = {
      name: 'Тестовая номенклатура',
      group: 'Тест',
      defaultCharacteristics: { width: 600, height: 700 },
      customerPricingMethod: 'area',
      baseCustomerPrice: 5000,
      attributes: {},
    };
    const payload = {
      ...productPayload,
      priceModifierIds: [priceModifierId],
    };
    const response = await fetch('http://localhost/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const created = (await response.json()) as Omit<
      typeof payload,
      'priceModifierIds'
    > & { id: string; priceModifierIds?: string[] };

    expect(response.status).toBe(201);
    expect(created).toMatchObject(productPayload);
    expect(created.priceModifierIds).toBeUndefined();
    expect(created.id).toBeTruthy();

    const modifierResponse = await fetch(
      `http://localhost/price-modifiers/${priceModifierId}`,
    );
    const modifier = (await modifierResponse.json()) as {
      productTemplates: { id: string }[];
    };

    expect(modifier.productTemplates).toContainEqual(
      expect.objectContaining({ id: created.id }),
    );
  });

  it('returns order ids for a group', async () => {
    const response = await fetch('http://localhost/order-groups/1/order-ids');
    const body = (await response.json()) as { items: { id: string }[] };

    expect(body.items).toEqual([
      {
        id: 'aa000000-0000-4000-8000-000000000001',
        name: 'Документ 1',
        totalPrice: 8500,
      },
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

  it('updates additional attributes and characteristics of an order item', async () => {
    const orderId = 'aa000000-0000-4000-8000-000000000001';
    const orderResponse = await fetch(
      `http://localhost/orders/${orderId}/with-items`,
    );
    const order = (await orderResponse.json()) as {
      items: { id: string }[];
    };
    const itemId = order.items[0].id;

    const response = await fetch(
      `http://localhost/orders/${orderId}/items/${itemId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attributes: { edge: 'painted', fragile: true },
          characteristics: { height: 800, holes: 4 },
        }),
      },
    );
    const updatedOrder = (await response.json()) as {
      items: {
        id: string;
        snapshot: { attributes: Record<string, unknown> };
        characteristics: Record<string, unknown>;
      }[];
    };
    const updatedItem = updatedOrder.items.find(({ id }) => id === itemId);

    expect(updatedItem?.snapshot.attributes).toEqual({
      edge: 'painted',
      fragile: true,
    });
    expect(updatedItem?.characteristics).toEqual({ height: 800, holes: 4 });
  });
});
