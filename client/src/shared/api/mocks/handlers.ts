import { http, HttpResponse, passthrough } from 'msw';

import { mockData, type MockEntity } from './mock-data';
import { priceModifierConditionPathSchemas } from './price-modifier-condition-paths';

const resources = Object.keys(mockData).filter(
  (resource) => resource !== 'price-modifiers',
);

export const isFrontendAssetRequest = (request: Request) => {
  const pathname = new URL(request.url).pathname;

  return (
    pathname.startsWith('/src/') ||
    pathname.startsWith('/@') ||
    pathname.startsWith('/node_modules/') ||
    pathname.startsWith('/assets/')
  );
};

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
  http.get(`*/${resource}`, ({ request }) =>
    isFrontendAssetRequest(request)
      ? passthrough()
      : HttpResponse.json({
          items: getCollectionResponse(resource),
          meta: { total: getCollection(resource).length },
        }),
  ),
  http.get(`*/${resource}/:id`, ({ params, request }) => {
    if (isFrontendAssetRequest(request)) return passthrough();

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

const resolveProductTemplates = (templateIds: unknown) => {
  if (!Array.isArray(templateIds)) return undefined;

  const ids = templateIds.map(String);
  const templates = getCollection('products').filter(({ id }) =>
    ids.includes(String(id)),
  );

  return templates.length === ids.length ? templates : null;
};

const priceModifierHandlers = [
  http.get('*/price-modifiers/condition-paths', () =>
    HttpResponse.json(priceModifierConditionPathSchemas),
  ),
  http.get('*/price-modifiers', () =>
    HttpResponse.json({
      items: getCollection('price-modifiers'),
      meta: { total: getCollection('price-modifiers').length },
    }),
  ),
  http.get('*/price-modifiers/:id', ({ params, request }) => {
    if (isFrontendAssetRequest(request)) return passthrough();

    const modifier = findById('price-modifiers', String(params.id));
    return modifier
      ? HttpResponse.json(modifier)
      : notFound('price-modifiers', String(params.id));
  }),
  http.post('*/price-modifiers', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const productTemplates = resolveProductTemplates(body.productTemplateIds);
    if (productTemplates === null) {
      return badRequest('One or more product template IDs are invalid.');
    }

    const now = new Date().toISOString();
    const modifierData = { ...body };
    delete modifierData.productTemplateIds;
    const modifier: MockEntity = {
      ...modifierData,
      id: createId('price-modifiers'),
      productTemplates: productTemplates ?? [],
      createdAt: now,
      updatedAt: now,
    };
    getCollection('price-modifiers').unshift(modifier);
    return HttpResponse.json(modifier, { status: 201 });
  }),
  http.patch('*/price-modifiers/:id', async ({ params, request }) => {
    const collection = getCollection('price-modifiers');
    const index = collection.findIndex(
      ({ id }) => String(id) === String(params.id),
    );
    if (index === -1) return notFound('price-modifiers', String(params.id));

    const body = (await request.json()) as Record<string, unknown>;
    const productTemplates = resolveProductTemplates(body.productTemplateIds);
    if (productTemplates === null) {
      return badRequest('One or more product template IDs are invalid.');
    }

    const modifierData = { ...body };
    delete modifierData.productTemplateIds;
    const modifier: MockEntity = {
      ...collection[index],
      ...modifierData,
      ...(productTemplates === undefined ? {} : { productTemplates }),
      updatedAt: new Date().toISOString(),
    };
    collection[index] = modifier;
    return HttpResponse.json(modifier);
  }),
  http.delete('*/price-modifiers/:id', ({ params }) => {
    const collection = getCollection('price-modifiers');
    const index = collection.findIndex(
      ({ id }) => String(id) === String(params.id),
    );
    if (index === -1) return notFound('price-modifiers', String(params.id));

    const [modifier] = collection.splice(index, 1);
    return HttpResponse.json(modifier);
  }),
];

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
    if (body.templateId) {
      const template = findById('products', String(body.templateId));
      if (!template) return notFound('products', String(body.templateId));

      body.template = template;
      body.snapshot = {
        name: template.name,
        baseCustomerPrice: template.baseCustomerPrice,
        attributes: template.attributes,
        customerPricingMethod: template.customerPricingMethod,
        defaultCharacteristics: template.defaultCharacteristics,
      };
      delete body.templateId;
    }
    if (body.attributes) {
      body.snapshot = {
        ...((body.snapshot ?? items[index].snapshot) as object),
        attributes: body.attributes,
      };
      delete body.attributes;
    }
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

export const handlers = [
  ...priceModifierHandlers,
  ...orderHandlers,
  ...entityHandlers,
];
