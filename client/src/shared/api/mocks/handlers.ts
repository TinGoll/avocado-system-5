import { http, HttpResponse } from 'msw';

import { mockData, type MockEntity } from './mock-data';

const resources = Object.keys(mockData);

const getCollection = (resource: string) => mockData[resource] ?? [];

const getCollectionResponse = (resource: string) => {
  const items = getCollection(resource);

  if (resource !== 'order-groups') return items;

  return items.map((group) => ({
    ...group,
    orders: getCollection('orders').filter(
      (order) => String(order.orderGroupId) === String(group.id),
    ),
  }));
};

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

const badRequest = (message: string) =>
  HttpResponse.json(
    {
      error: {
        message,
        code: 'BAD_REQUEST',
      },
    },
    { status: 400 },
  );

const calculateOrderItemPrice = (
  template: MockEntity,
  characteristics: Record<string, unknown>,
  quantity: number,
) => {
  const basePrice = Number(template.baseCustomerPrice) || 0;

  if (template.customerPricingMethod === 'area') {
    const width = Number(characteristics.width) || 0;
    const height = Number(characteristics.height) || 0;
    return (width * height * basePrice * quantity) / 1_000_000;
  }

  if (template.customerPricingMethod === 'linear_meter') {
    const length =
      Number(characteristics.height) || Number(characteristics.width) || 0;
    return (length * basePrice * quantity) / 1_000;
  }

  return basePrice * quantity;
};

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
      items: getCollectionResponse(resource),
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
  http.post('*/orders/:id/copy', async ({ params, request }) => {
    const source = findById('orders', String(params.id));
    if (!source) return notFound('orders', String(params.id));

    const body = (await request.json()) as { name?: string };
    const now = new Date().toISOString();
    const order = structuredClone(source);

    order.id = crypto.randomUUID();
    order.name = body.name ?? `Копия ${String(source.name ?? 'документа')}`;
    order.items = ((order.items as MockEntity[]) ?? []).map((item) => ({
      ...item,
      id: crypto.randomUUID(),
    }));
    order.createdAt = now;
    order.updatedAt = now;
    getCollection('orders').unshift(order);

    return HttpResponse.json(order, { status: 201 });
  }),
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

    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return badRequest('quantity must be a positive integer');
    }

    const characteristics = {
      ...((template.defaultCharacteristics as Record<string, unknown>) ?? {}),
      ...((body.characteristics as Record<string, unknown>) ?? {}),
    };
    const calculatedCustomerPrice = calculateOrderItemPrice(
      template,
      characteristics,
      quantity,
    );

    const item = {
      id: crypto.randomUUID(),
      template,
      snapshot: {
        name: template.name,
        baseCustomerPrice: template.baseCustomerPrice,
        attributes: template.attributes,
        customerPricingMethod: template.customerPricingMethod,
        defaultCharacteristics: template.defaultCharacteristics,
      },
      quantity,
      characteristics,
      calculatedProductionCost: 0,
      calculatedCustomerPrice,
      position: ((order.items as unknown[]) ?? []).length,
    };
    order.items = [...((order.items as unknown[]) ?? []), item];
    order.totalPrice = (
      order.items as { calculatedCustomerPrice: number }[]
    ).reduce(
      (total, orderItem) => total + orderItem.calculatedCustomerPrice,
      0,
    );
    order.updatedAt = new Date().toISOString();
    return HttpResponse.json(order, { status: 201 });
  }),
  http.patch('*/orders/:orderId/items/reorder', async ({ params, request }) => {
    const order = findById('orders', String(params.orderId));
    if (!order) return notFound('orders', String(params.orderId));

    const { itemIds } = (await request.json()) as { itemIds: string[] };
    const items = (order.items as MockEntity[]) ?? [];
    const itemsById = new Map(items.map((item) => [String(item.id), item]));
    if (
      itemIds.length !== items.length ||
      itemIds.some((itemId) => !itemsById.has(itemId))
    ) {
      return badRequest('itemIds must contain every order item');
    }

    order.items = itemIds.map((itemId, position) => ({
      ...itemsById.get(itemId)!,
      position,
    }));
    return HttpResponse.json(order);
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
