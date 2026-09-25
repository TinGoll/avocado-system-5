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

const customStatuses: MockEntity[] = [];
let managementTimeZone = 'Europe/Moscow';
let managementAutoAdd: Record<string, string | null> = {
  autoAddStatus: null,
  autoAddBoardId: null,
  autoAddStageId: null,
};
let managementDueDateRules: unknown[] = [];

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
    const priceModifierIds =
      resource === 'products' && Array.isArray(body.priceModifierIds)
        ? body.priceModifierIds.map(String)
        : [];
    const priceModifiers = getCollection('price-modifiers').filter(({ id }) =>
      priceModifierIds.includes(String(id)),
    );

    if (
      resource === 'products' &&
      priceModifiers.length !== priceModifierIds.length
    ) {
      return badRequest('One or more price modifier IDs are invalid.');
    }

    const entityData = { ...body };
    delete entityData.priceModifierIds;
    if (resource === 'orders') {
      const groupOrders = getCollection('orders').filter(
        (order) => String(order.orderGroupId) === String(body.orderGroupId),
      );
      entityData.documentNumber =
        Math.max(
          0,
          ...groupOrders.map(
            ({ documentNumber }) => Number(documentNumber) || 0,
          ),
        ) + 1;
    }
    const now = new Date().toISOString();
    const entity: MockEntity = {
      ...entityData,
      id: createId(resource),
      createdAt: now,
      updatedAt: now,
    };
    getCollection(resource).unshift(entity);

    priceModifiers.forEach((modifier) => {
      const productTemplates = Array.isArray(modifier.productTemplates)
        ? modifier.productTemplates
        : [];
      modifier.productTemplates = [...productTemplates, entity];
    });

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
  http.post('*/orders/:id/recalculate-prices', ({ params }) => {
    const order = findById('orders', String(params.id));
    if (!order) return notFound('orders', String(params.id));

    const items = (order.items as MockEntity[]) ?? [];
    order.items = items.map((item) => ({
      ...item,
      calculatedCustomerPrice: calculateOrderItemPrice(
        item.snapshot as MockEntity,
        item.characteristics as Record<string, unknown>,
        Number(item.quantity),
      ),
    }));
    order.totalPrice = (order.items as MockEntity[]).reduce(
      (total, item) => total + Number(item.calculatedCustomerPrice),
      0,
    );
    order.updatedAt = new Date().toISOString();

    return HttpResponse.json(order);
  }),
  http.post('*/orders/:id/copy', async ({ params, request }) => {
    const source = findById('orders', String(params.id));
    if (!source) return notFound('orders', String(params.id));

    const body = (await request.json()) as { name?: string };
    const now = new Date().toISOString();
    const order = structuredClone(source);

    order.id = crypto.randomUUID();
    order.name = body.name ?? `Копия ${String(source.name ?? 'документа')}`;
    const groupOrders = getCollection('orders').filter(
      (item) => String(item.orderGroupId) === String(source.orderGroupId),
    );
    order.documentNumber =
      Math.max(
        0,
        ...groupOrders.map(({ documentNumber }) => Number(documentNumber) || 0),
      ) + 1;
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
      .sort(
        (first, second) =>
          Number(first.documentNumber) - Number(second.documentNumber),
      )
      .map(({ id, name, documentNumber, totalPrice }) => ({
        id,
        name,
        documentNumber,
        totalPrice,
      }));
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

const managementView = (
  resource: 'order-groups' | 'orders',
  entity: MockEntity,
) => {
  const group =
    resource === 'orders'
      ? findById('order-groups', String(entity.orderGroupId))
      : entity;
  const dueDate = typeof entity.dueDate === 'string' ? entity.dueDate : null;
  const groupDueDate =
    typeof group?.dueDate === 'string' ? group.dueDate : null;
  const customStatusIds = Array.isArray(entity.customStatusIds)
    ? (entity.customStatusIds as string[])
    : typeof entity.customStatusId === 'string'
      ? [entity.customStatusId]
      : [];
  const assignedStatuses = customStatusIds
    .map((id) => customStatuses.find((status) => status.id === id))
    .filter((status): status is MockEntity => Boolean(status));
  const customStatusId = customStatusIds[0] ?? null;
  return {
    id: entity.id,
    ...(resource === 'orders'
      ? {
          orderGroupId: entity.orderGroupId ?? null,
          effectiveDueDate: dueDate ?? groupDueDate,
        }
      : {}),
    dueDate,
    customStatusId,
    customStatus: customStatusId
      ? (customStatuses.find(({ id }) => id === customStatusId) ?? null)
      : null,
    customStatusIds,
    customStatuses: assignedStatuses,
    managementVersion: Number(entity.managementVersion) || 0,
    ...(resource === 'order-groups' ? { status: entity.status } : {}),
  };
};

const managementHandlers = [
  http.get('*/order-management/statuses', ({ request }) => {
    const scope = new URL(request.url).searchParams.get('scope');
    const items = customStatuses.filter(
      (status) => !scope || status.scope === scope,
    );
    return HttpResponse.json({ items, meta: { count: items.length } });
  }),
  http.post('*/order-management/statuses', async ({ request }) => {
    const body = (await request.json()) as MockEntity;
    const status = {
      ...body,
      id: crypto.randomUUID(),
      archivedAt: null,
      position: body.position ?? customStatuses.length,
    };
    customStatuses.push(status);
    return HttpResponse.json(status, { status: 201 });
  }),
  http.patch('*/order-management/statuses/:id', async ({ params, request }) => {
    const status = customStatuses.find(({ id }) => id === params.id);
    if (!status) return notFound('custom status', String(params.id));
    Object.assign(status, (await request.json()) as object);
    return HttpResponse.json(status);
  }),
  http.post('*/order-management/statuses/:id/archive', ({ params }) => {
    const status = customStatuses.find(({ id }) => id === params.id);
    if (!status) return notFound('custom status', String(params.id));
    status.archivedAt = new Date().toISOString();
    return HttpResponse.json(status, { status: 201 });
  }),
  http.delete('*/order-management/statuses/:id', ({ params }) => {
    const index = customStatuses.findIndex(({ id }) => id === params.id);
    if (index === -1) return notFound('custom status', String(params.id));
    const [status] = customStatuses.splice(index, 1);
    return HttpResponse.json({ id: status.id });
  }),
  http.get('*/order-management/settings', () =>
    HttpResponse.json({
      id: 1,
      timeZone: managementTimeZone,
      ...managementAutoAdd,
      dueDateRules: managementDueDateRules,
    }),
  ),
  http.patch('*/order-management/settings', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.timeZone === 'string') managementTimeZone = body.timeZone;
    managementAutoAdd = {
      autoAddStatus:
        typeof body.autoAddStatus === 'string' ? body.autoAddStatus : null,
      autoAddBoardId:
        typeof body.autoAddBoardId === 'string' ? body.autoAddBoardId : null,
      autoAddStageId:
        typeof body.autoAddStageId === 'string' ? body.autoAddStageId : null,
    };
    managementDueDateRules = Array.isArray(body.dueDateRules)
      ? body.dueDateRules
      : managementDueDateRules;
    return HttpResponse.json({
      id: 1,
      timeZone: managementTimeZone,
      ...managementAutoAdd,
      dueDateRules: managementDueDateRules,
    });
  }),
  ...(['order-groups', 'orders'] as const).flatMap((resource) => [
    http.get(`*/${resource}/:id/management`, ({ params }) => {
      const entity = findById(resource, String(params.id));
      return entity
        ? HttpResponse.json(managementView(resource, entity))
        : notFound(resource, String(params.id));
    }),
    http.patch(`*/${resource}/:id/management`, async ({ params, request }) => {
      const entity = findById(resource, String(params.id));
      if (!entity) return notFound(resource, String(params.id));
      const body = (await request.json()) as Record<string, unknown>;
      if (
        Number(body.expectedVersion) !== (Number(entity.managementVersion) || 0)
      ) {
        return HttpResponse.json(
          {
            error: {
              message: 'Order management data changed',
              code: 'CONFLICT',
            },
          },
          { status: 409 },
        );
      }
      if ('dueDate' in body) entity.dueDate = body.dueDate;
      if ('customStatusId' in body) entity.customStatusId = body.customStatusId;
      if ('customStatusIds' in body) {
        entity.customStatusIds = body.customStatusIds;
        entity.customStatusId = Array.isArray(body.customStatusIds)
          ? (body.customStatusIds[0] ?? null)
          : null;
      }
      entity.managementVersion = (Number(entity.managementVersion) || 0) + 1;
      return HttpResponse.json(managementView(resource, entity));
    }),
  ]),
];

const productionBoards: MockEntity[] = [];
const productionCards: MockEntity[] = [];

const productionBoardHandlers = [
  http.get('*/production-boards', () =>
    HttpResponse.json({
      items: productionBoards.map((board) => {
        const summary = { ...board };
        delete summary.stages;
        return summary;
      }),
      meta: { count: productionBoards.length },
    }),
  ),
  http.post('*/production-boards', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const boardId = crypto.randomUUID();
    const stages = (body.stages as Record<string, unknown>[]).map(
      (stage, position) => ({
        ...stage,
        id: crypto.randomUUID(),
        boardId,
        position,
        usedAt: null,
        archivedAt: null,
      }),
    );
    const board = {
      id: boardId,
      name: body.name,
      description: body.description ?? null,
      initialStageId: stages[Number(body.initialStageIndex)].id,
      version: 0,
      archivedAt: null,
      stages,
    };
    productionBoards.push(board);
    return HttpResponse.json(board, { status: 201 });
  }),
  http.get('*/production-boards/:id', ({ params }) => {
    const board = productionBoards.find(({ id }) => id === params.id);
    return board
      ? HttpResponse.json(board)
      : notFound('production board', String(params.id));
  }),
  http.patch('*/production-boards/:id', async ({ params, request }) => {
    const board = productionBoards.find(({ id }) => id === params.id);
    if (!board) return notFound('production board', String(params.id));
    const body = (await request.json()) as Record<string, unknown>;
    if (Number(body.expectedVersion) !== Number(board.version))
      return HttpResponse.json(
        { error: { message: 'Board changed', code: 'CONFLICT' } },
        { status: 409 },
      );
    Object.assign(board, body, { version: Number(board.version) + 1 });
    delete board.expectedVersion;
    return HttpResponse.json(board);
  }),
  http.post('*/production-boards/:id/archive', async ({ params, request }) => {
    const board = productionBoards.find(({ id }) => id === params.id);
    if (!board) return notFound('production board', String(params.id));
    const body = (await request.json()) as { expectedVersion: number };
    if (body.expectedVersion !== Number(board.version))
      return HttpResponse.json(
        { error: { message: 'Board changed', code: 'CONFLICT' } },
        { status: 409 },
      );
    board.archivedAt = new Date().toISOString();
    board.version = Number(board.version) + 1;
    return HttpResponse.json(board, { status: 201 });
  }),
  http.post('*/production-boards/:id/stages', async ({ params, request }) => {
    const board = productionBoards.find(({ id }) => id === params.id);
    if (!board) return notFound('production board', String(params.id));
    const body = (await request.json()) as Record<string, unknown>;
    const stages = board.stages as MockEntity[];
    const stage: MockEntity = {
      ...body,
      id: crypto.randomUUID(),
      boardId: board.id,
      position: stages.length,
      usedAt: null,
      archivedAt: null,
    };
    delete stage.expectedVersion;
    stages.push(stage);
    board.version = Number(board.version) + 1;
    return HttpResponse.json(board, { status: 201 });
  }),
  http.patch(
    '*/production-boards/:id/stages/:stageId',
    async ({ params, request }) => {
      const board = productionBoards.find(({ id }) => id === params.id);
      const stage = (board?.stages as MockEntity[] | undefined)?.find(
        ({ id }) => id === params.stageId,
      );
      if (!board || !stage)
        return notFound('production stage', String(params.stageId));
      const body = (await request.json()) as Record<string, unknown>;
      Object.assign(stage, body);
      delete stage.expectedVersion;
      board.version = Number(board.version) + 1;
      return HttpResponse.json(board);
    },
  ),
  http.post(
    '*/production-boards/:id/stages/:stageId/archive',
    async ({ params }) => {
      const board = productionBoards.find(({ id }) => id === params.id);
      const stage = (board?.stages as MockEntity[] | undefined)?.find(
        ({ id }) => id === params.stageId,
      );
      if (!board || !stage)
        return notFound('production stage', String(params.stageId));
      stage.archivedAt = new Date().toISOString();
      board.version = Number(board.version) + 1;
      return HttpResponse.json(board, { status: 201 });
    },
  ),
  http.delete('*/production-boards/:id/stages/:stageId', ({ params }) => {
    const board = productionBoards.find(({ id }) => id === params.id);
    if (!board) return notFound('production board', String(params.id));
    board.stages = (board.stages as MockEntity[]).filter(
      ({ id }) => id !== params.stageId,
    );
    board.version = Number(board.version) + 1;
    return HttpResponse.json(board);
  }),
  http.put(
    '*/production-boards/:id/stage-order',
    async ({ params, request }) => {
      const board = productionBoards.find(({ id }) => id === params.id);
      if (!board) return notFound('production board', String(params.id));
      const { stageIds } = (await request.json()) as { stageIds: string[] };
      const byId = new Map(
        (board.stages as MockEntity[]).map((stage) => [stage.id, stage]),
      );
      board.stages = stageIds.map((id, position) => ({
        ...byId.get(id)!,
        position,
      }));
      board.version = Number(board.version) + 1;
      return HttpResponse.json(board);
    },
  ),
  http.get('*/production-boards/:id/cards', ({ params, request }) => {
    const stageId = new URL(request.url).searchParams.get('stageId');
    const board = productionBoards.find(({ id }) => id === params.id);
    if (!board) return notFound('production board', String(params.id));
    const stageIds = (board.stages as MockEntity[]).map(({ id }) => id);
    const items = productionCards.filter(
      (card) =>
        stageIds.includes(String(card.stageId)) &&
        (!stageId || card.stageId === stageId),
    );
    return HttpResponse.json({ items, meta: { nextCursor: null } });
  }),
  http.post('*/production-boards/:id/cards', async ({ params, request }) => {
    const board = productionBoards.find(({ id }) => id === params.id);
    if (!board) return notFound('production board', String(params.id));
    const body = (await request.json()) as Record<string, unknown>;
    if (Number(body.expectedBoardVersion) !== Number(board.version)) {
      return HttpResponse.json(
        { error: { message: 'Board changed', code: 'CONFLICT' } },
        { status: 409 },
      );
    }
    const order = findById('orders', String(body.orderId));
    if (!order) return notFound('orders', String(body.orderId));
    const group = findById('order-groups', String(order.orderGroupId));
    const customStatus = customStatuses.find(
      ({ id }) => id === order.customStatusId,
    );
    const assignedStatuses = (
      Array.isArray(order.customStatusIds)
        ? order.customStatusIds
        : order.customStatusId
          ? [order.customStatusId]
          : []
    )
      .map((id) => customStatuses.find((status) => status.id === id))
      .filter((status): status is MockEntity => Boolean(status));
    const card = {
      id: crypto.randomUUID(),
      orderId: order.id,
      stageId: board.initialStageId,
      position: productionCards.length,
      progressPercent: 0,
      enteredStageAt: new Date().toISOString(),
      version: 0,
      documentName: order.name ?? null,
      documentNumber: order.documentNumber,
      documentVersion: Number(order.managementVersion) || 0,
      effectiveDueDate: order.dueDate ?? group?.dueDate ?? null,
      customStatusId: order.customStatusId ?? null,
      customStatusName: customStatus?.name ?? null,
      customStatusColor: customStatus?.color ?? null,
      customStatuses: assignedStatuses,
      orderGroupId: group?.id,
      orderNumber: group?.orderNumber,
      groupVersion: Number(group?.managementVersion) || 0,
    };
    productionCards.push(card);
    board.version = Number(board.version) + 1;
    return HttpResponse.json(card, { status: 201 });
  }),
  http.post('*/production-cards/:id/move', async ({ params, request }) => {
    const card = productionCards.find(({ id }) => id === params.id);
    if (!card) return notFound('production card', String(params.id));
    const board = productionBoards.find(({ stages }) =>
      (stages as MockEntity[]).some(({ id }) => id === card.stageId),
    );
    const body = (await request.json()) as Record<string, unknown>;
    if (
      !board ||
      Number(body.expectedBoardVersion) !== Number(board.version) ||
      Number(body.expectedCardVersion) !== Number(card.version)
    ) {
      return HttpResponse.json(
        { error: { message: 'Card changed', code: 'CONFLICT' } },
        { status: 409 },
      );
    }
    const target = (board.stages as MockEntity[]).find(
      ({ id }) => id === body.targetStageId,
    );
    card.stageId = body.targetStageId;
    card.progressPercent = target?.progressPercent ?? card.progressPercent;
    card.version = Number(card.version) + 1;
    board.version = Number(board.version) + 1;
    return HttpResponse.json(card);
  }),
  http.post('*/production-cards/:id/transfer', async ({ params, request }) => {
    const card = productionCards.find(({ id }) => id === params.id);
    if (!card) return notFound('production card', String(params.id));
    const body = (await request.json()) as Record<string, unknown>;
    card.stageId = body.targetStageId;
    card.version = Number(card.version) + 1;
    return HttpResponse.json(card);
  }),
];

const templateVariables = [
  {
    path: 'item.quantity',
    label: 'Количество',
    description: 'Количество позиций заказа',
    valueType: 'number',
    unit: 'шт.',
  },
  {
    path: 'item.name',
    label: 'Название продукта',
    description: 'Название продукта в позиции заказа',
    valueType: 'string',
    optional: true,
  },
];

const productOutputVariables = [
  ...templateVariables,
  ...['item.width', 'item.height', 'item.thickness'].map((path) => ({
    path,
    label: path,
    description: path,
    valueType: 'number',
    optional: true,
  })),
  ...['material', 'color', 'patina', 'profile', 'panel', 'varnish'].map(
    (name) => ({
      path: `${name}.name`,
      label: name,
      description: name,
      valueType: 'string',
      optional: true,
    }),
  ),
];

const financePaymentId = '11111111-1111-4111-8111-111111111111';
const financeCustomerId = '22222222-2222-4222-8222-222222222222';
const financeAccrualId = '33333333-3333-4333-8333-333333333333';
const financeHandlers = [
  http.get('*/finance/order-groups/:id', ({ params }) =>
    HttpResponse.json({
      orderGroup: {
        id: Number(params.id),
        orderNumber: 'ORD-2026-154',
        customerId: financeCustomerId,
      },
      orderTotalMinor: 18500000,
      orderTotal: '185000.00',
      accruedMinor: 18500000,
      accrued: '185000.00',
      allocatedMinor: 13000000,
      allocated: '130000.00',
      remainingMinor: 5500000,
      remaining: '55000.00',
      syncDifferenceMinor: 0,
      syncDifference: '0.00',
      customerUnallocatedAdvanceMinor: 2000000,
      customerUnallocatedAdvance: '20000.00',
      accrualId: financeAccrualId,
      accrualStatus: 'active',
      accrualVersion: 0,
    }),
  ),
  http.get('*/finance/summary', () =>
    HttpResponse.json({
      accruedMinor: 28500000,
      accrued: '285000.00',
      paidMinor: 21000000,
      paid: '210000.00',
      balanceMinor: 7500000,
      balance: '75000.00',
      debtMinor: 9500000,
      debt: '95000.00',
      advanceMinor: 2000000,
      advance: '20000.00',
      allocatedMinor: 19000000,
      allocated: '190000.00',
      unallocatedMinor: 2000000,
      unallocated: '20000.00',
      customerLinkIssuesCount: 1,
    }),
  ),
  http.get('*/finance/payments', () =>
    HttpResponse.json({
      items: [
        {
          id: financePaymentId,
          customerId: financeCustomerId,
          customerName: 'Мастерская Северный дуб',
          businessDate: '2026-09-23',
          method: 'bank_transfer',
          externalReference: 'Платёжное поручение 154',
          comment: 'Оплата по двум заказам',
          status: 'posted',
          version: 0,
          amountMinor: 15000000,
          amount: '150000.00',
          allocatedMinor: 13000000,
          allocated: '130000.00',
          unallocatedMinor: 2000000,
          unallocated: '20000.00',
          allocationState: 'partial',
        },
      ],
      meta: { limit: 30, nextCursor: null },
    }),
  ),
  http.get('*/finance/payments/:id', () =>
    HttpResponse.json({
      id: financePaymentId,
      allocations: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          accrualId: financeAccrualId,
          amountMinor: 13000000,
          amount: '130000.00',
          status: 'active',
          releasedAt: null,
          releaseReason: null,
        },
      ],
    }),
  ),
  http.get('*/finance/accruals', () =>
    HttpResponse.json({
      items: [
        {
          id: financeAccrualId,
          customerId: financeCustomerId,
          customerName: 'Мастерская Северный дуб',
          sourceType: 'order',
          orderGroupId: 1,
          orderNumber: 'ORD-2026-154',
          title: 'ORD-2026-154',
          status: 'active',
          version: 0,
          businessDate: '2026-09-22',
          amountMinor: 18500000,
          amount: '185000.00',
          allocatedMinor: 13000000,
          allocated: '130000.00',
          remainingMinor: 5500000,
          remaining: '55000.00',
          state: 'partially_paid',
        },
      ],
      meta: { limit: 30, nextCursor: null },
    }),
  ),
  http.get('*/finance/customers', () =>
    HttpResponse.json({
      items: [
        {
          id: financeCustomerId,
          name: 'Мастерская Северный дуб',
          companyName: 'ООО Северный дуб',
          debtMinor: 3500000,
          debt: '35000.00',
          advanceMinor: 0,
          advance: '0.00',
          unallocatedMinor: 2000000,
          unallocated: '20000.00',
        },
      ],
      meta: { count: 1 },
    }),
  ),
  http.get('*/finance/customers/:id', () =>
    HttpResponse.json({
      customer: {
        id: financeCustomerId,
        name: 'Мастерская Северный дуб',
        companyName: 'ООО Северный дуб',
      },
      recentOperations: [
        {
          kind: 'payment',
          businessDate: '2026-09-23',
          id: financePaymentId,
          amountMinor: 15000000,
          amount: '150000.00',
          title: 'Платёжное поручение 154',
        },
      ],
      openAccruals: [],
    }),
  ),
  http.get('*/order-groups/customer-link-issues', () =>
    HttpResponse.json({
      items: [
        {
          id: 7,
          orderNumber: 'ARCHIVE-007',
          reason: 'missing_or_invalid_customer_id',
        },
      ],
      meta: { count: 1 },
    }),
  ),
];

export const handlers = [
  http.get('*/health', () => HttpResponse.json({ status: 'ok' })),
  http.get('*/template-variables', ({ request }) => {
    const scope = new URL(request.url).searchParams.get('scope');
    const variables =
      scope === 'product-output'
        ? productOutputVariables
        : scope === 'production-operation-formula'
          ? templateVariables.filter(({ valueType }) => valueType === 'number')
          : [
              ...templateVariables,
              {
                path: 'product.display',
                label: 'Представление продукта',
                description: 'Результат шаблона',
                valueType: 'string',
                optional: true,
              },
            ];
    return HttpResponse.json({ variables });
  }),
  http.post('*/products/display-template/preview', async ({ request }) => {
    const body = (await request.json()) as { displayTemplate: string };
    return HttpResponse.json({ renderedValue: body.displayTemplate });
  }),
  ...priceModifierHandlers,
  ...managementHandlers,
  ...productionBoardHandlers,
  ...orderHandlers,
  ...financeHandlers,
  ...entityHandlers,
];
