import { http, HttpResponse } from 'msw';

import { mockData, type MockEntity } from './mock-data';

const resources = Object.keys(mockData);

const getCollection = (resource: string) => mockData[resource] ?? [];

const findById = (resource: string, id: string) =>
  getCollection(resource).find((item) => String(item.id) === id);

const notFound = (resource: string, id: string) =>
  HttpResponse.json(
    {
      error: {
        message: `${resource} with id ${id} not found`,
        code: 'NOT_FOUND',
      },
    },
    { status: 404 },
  );

const createId = (resource: string) => {
  if (resource === 'order-groups') {
    return (
      Math.max(0, ...getCollection(resource).map(({ id }) => Number(id))) + 1
    );
  }

  return crypto.randomUUID();
};

const entityHandlers = resources.flatMap((resource) => [
  http.get(`*/${resource}`, () =>
    HttpResponse.json({
      items: getCollection(resource),
      meta: { total: getCollection(resource).length },
    }),
  ),
  http.get(`*/${resource}/:id`, ({ params }) => {
    const entity = findById(resource, String(params.id));
    return entity
      ? HttpResponse.json(entity)
      : notFound(resource, String(params.id));
  }),
  http.post(`*/${resource}`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const now = new Date().toISOString();
    const entity: MockEntity = {
      ...body,
      id: createId(resource),
      createdAt: now,
      updatedAt: now,
    };
    getCollection(resource).unshift(entity);
    return HttpResponse.json(entity, { status: 201 });
  }),
  http.patch(`*/${resource}/:id`, async ({ params, request }) => {
    const collection = getCollection(resource);
    const index = collection.findIndex(
      (item) => String(item.id) === String(params.id),
    );
    if (index === -1) return notFound(resource, String(params.id));

    const body = (await request.json()) as Record<string, unknown>;
    const entity = {
      ...collection[index],
      ...body,
      updatedAt: new Date().toISOString(),
    } as MockEntity;
    collection[index] = entity;
    return HttpResponse.json(entity);
  }),
  http.delete(`*/${resource}/:id`, ({ params }) => {
    const collection = getCollection(resource);
    const index = collection.findIndex(
      (item) => String(item.id) === String(params.id),
    );
    if (index === -1) return notFound(resource, String(params.id));

    collection.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
]);

const orderHandlers = [
  http.get('*/order-groups/:id/order-ids', ({ params }) => {
    const items = getCollection('orders')
      .filter((order) => String(order.orderGroupId) === String(params.id))
      .map(({ id, name }) => ({ id, name }));
    return HttpResponse.json({ items });
  }),
  http.get('*/order-groups/:id/with-order-ids', ({ params }) => {
    const group = findById('order-groups', String(params.id));
    if (!group) return notFound('order-groups', String(params.id));

    const orderIds = getCollection('orders')
      .filter((order) => String(order.orderGroupId) === String(params.id))
      .map(({ id }) => String(id));
    return HttpResponse.json({ ...group, orderIds });
  }),
  http.get('*/orders/:id/with-items', ({ params }) => {
    const order = findById('orders', String(params.id));
    return order
      ? HttpResponse.json(order)
      : notFound('orders', String(params.id));
  }),
  http.post('*/orders/:id/items', async ({ params, request }) => {
    const order = findById('orders', String(params.id));
    if (!order) return notFound('orders', String(params.id));

    const body = (await request.json()) as Record<string, unknown>;
    const template = findById('products', String(body.templateId));
    if (!template) return notFound('products', String(body.templateId));

    const item = {
      id: crypto.randomUUID(),
      template,
      snapshot: template,
      quantity: body.quantity,
      characteristics: body.characteristics,
      calculatedProductionCost: 0,
      calculatedCustomerPrice: 0,
    };
    order.items = [...((order.items as unknown[]) ?? []), item];
    order.updatedAt = new Date().toISOString();
    return HttpResponse.json(order, { status: 201 });
  }),
  http.patch('*/orders/:orderId/items/:itemId', async ({ params, request }) => {
    const order = findById('orders', String(params.orderId));
    if (!order) return notFound('orders', String(params.orderId));

    const items = (order.items as MockEntity[]) ?? [];
    const index = items.findIndex(
      (item) => String(item.id) === String(params.itemId),
    );
    if (index === -1) return notFound('order items', String(params.itemId));

    const body = (await request.json()) as Record<string, unknown>;
    items[index] = { ...items[index], ...body } as MockEntity;
    return HttpResponse.json(order);
  }),
  http.delete('*/orders/:orderId/items/:itemId', ({ params }) => {
    const order = findById('orders', String(params.orderId));
    if (!order) return notFound('orders', String(params.orderId));

    const items = (order.items as MockEntity[]) ?? [];
    const index = items.findIndex(
      (item) => String(item.id) === String(params.itemId),
    );
    if (index === -1) return notFound('order items', String(params.itemId));
    items.splice(index, 1);
    return HttpResponse.json(order);
  }),
];

export const handlers = [...orderHandlers, ...entityHandlers];
