/* eslint-disable @typescript-eslint/no-require-imports */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import type { Server } from 'node:http';
import type { OrderGroup } from '../src/modules/order-groups/entities/order-group.entity';
import type { Order } from '../src/modules/orders/entities/order.entity';
import type { OrderManagementEvent } from '../src/modules/order-management/entities/order-management-event.entity';
import type { OrderManagementEventService } from '../src/modules/order-management/order-management-event.service';
import type { PricingService } from '../src/modules/pricing/pricing.service';

describe('Order management HTTP (SQLite)', () => {
  let app: INestApplication;
  let http: Server;
  let source: DataSource;
  let directory: string;
  let Group: typeof OrderGroup;
  let Document: typeof Order;
  let Event: typeof OrderManagementEvent;
  let journal: OrderManagementEventService;
  let pricing: PricingService;
  const oldKind = process.env.DB_TYPE;
  const oldPath = process.env.DB_PATH;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'avocado-management-'));
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = join(directory, 'test.sqlite');
    const { AppModule } =
      require('../src/app.module') as typeof import('../src/app.module');
    const { createAppValidationPipe } =
      require('../src/common/pipes/app-validation.pipe') as typeof import('../src/common/pipes/app-validation.pipe');
    const { WrapItemsInterceptor } =
      require('../src/common/interceptors/wrap-items.interceptor') as typeof import('../src/common/interceptors/wrap-items.interceptor');
    Group = (
      require('../src/modules/order-groups/entities/order-group.entity') as typeof import('../src/modules/order-groups/entities/order-group.entity')
    ).OrderGroup;
    Document = (
      require('../src/modules/orders/entities/order.entity') as typeof import('../src/modules/orders/entities/order.entity')
    ).Order;
    Event = (
      require('../src/modules/order-management/entities/order-management-event.entity') as typeof import('../src/modules/order-management/entities/order-management-event.entity')
    ).OrderManagementEvent;
    const { OrderManagementEventService: Journal } =
      require('../src/modules/order-management/order-management-event.service') as typeof import('../src/modules/order-management/order-management-event.service');
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useLogger(false);
    app.setGlobalPrefix('api');
    app.useGlobalPipes(createAppValidationPipe());
    app.useGlobalInterceptors(new WrapItemsInterceptor());
    await app.init();
    http = app.getHttpServer() as Server;
    source = app.get(DataSource);
    journal = app.get(Journal);
    const { PricingService: Pricing } =
      require('../src/modules/pricing/pricing.service') as typeof import('../src/modules/pricing/pricing.service');
    pricing = app.get(Pricing);
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
    if (directory) await rm(directory, { recursive: true, force: true });
    if (oldKind === undefined) delete process.env.DB_TYPE;
    else process.env.DB_TYPE = oldKind;
    if (oldPath === undefined) delete process.env.DB_PATH;
    else process.env.DB_PATH = oldPath;
  });

  async function fixture() {
    const group = await source.manager.save(
      Group,
      source.manager.create(Group, { orderNumber: randomUUID(), customer: {} }),
    );
    const document = await source.manager.save(
      Document,
      source.manager.create(Document, {
        documentNumber: 1,
        name: 'Фасады',
        orderGroup: group,
        totalPrice: 123.45,
      }),
    );
    return {
      group,
      document,
      groupUrl: `/api/order-groups/${group.id}/management`,
      documentUrl: `/api/orders/${document.id}/management`,
    };
  }

  async function status(scope: 'group' | 'document') {
    const response = await request(http)
      .post('/api/order-management/statuses')
      .send({ scope, name: '  Ожидание  ', color: '#aabbcc' })
      .expect(201);
    expect(response.body).toMatchObject({
      name: 'Ожидание',
      scope,
      archivedAt: null,
    });
    return (response.body as { id: string }).id;
  }

  it('inherits calendar dates and protects both group and document versions', async () => {
    const { group, groupUrl, documentUrl } = await fixture();
    await request(http)
      .patch(groupUrl)
      .send({ expectedVersion: 0, dueDate: '2026-09-10' })
      .expect(200);
    let response = await request(http).get(documentUrl).expect(200);
    expect(response.body).toMatchObject({
      dueDate: null,
      effectiveDueDate: '2026-09-10',
      managementVersion: 0,
    });
    await request(http)
      .patch(documentUrl)
      .send({ expectedVersion: 0, dueDate: '2026-09-12' })
      .expect(200);
    await request(http)
      .patch(documentUrl)
      .send({ expectedVersion: 0, dueDate: '2026-09-13' })
      .expect(409);
    await request(http)
      .patch(groupUrl)
      .send({ expectedVersion: 1, dueDate: null })
      .expect(409);
    await request(http)
      .patch(groupUrl)
      .send({ expectedVersion: 2, dueDate: '2026-09-15' })
      .expect(200);
    response = await request(http).get(documentUrl).expect(200);
    expect(response.body).toMatchObject({
      dueDate: '2026-09-12',
      effectiveDueDate: '2026-09-12',
      managementVersion: 1,
    });
    response = await request(http)
      .patch(documentUrl)
      .send({ expectedVersion: 1, dueDate: null })
      .expect(200);
    expect(response.body).toMatchObject({
      dueDate: null,
      effectiveDueDate: '2026-09-15',
      managementVersion: 2,
    });
    expect(
      await source.manager.countBy(Event, { orderGroupId: group.id }),
    ).toBe(4);
  });

  it('accepts only one of two simultaneous updates and journals it once', async () => {
    const { group, groupUrl } = await fixture();
    const responses = await Promise.all([
      request(http)
        .patch(groupUrl)
        .send({ expectedVersion: 0, dueDate: '2026-09-10' }),
      request(http)
        .patch(groupUrl)
        .send({ expectedVersion: 0, dueDate: '2026-09-11' }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    expect(
      await source.manager.countBy(Event, { orderGroupId: group.id }),
    ).toBe(1);
  });

  it('validates dates, primitives, unknown fields and IANA zones', async () => {
    const { group, document, groupUrl, documentUrl } = await fixture();
    for (const dueDate of [
      '2026-02-30',
      '2026-09-10T00:00:00Z',
      '2026-9-10',
      '0000-01-01',
      123,
    ]) {
      await request(http)
        .patch(groupUrl)
        .send({ expectedVersion: 0, dueDate })
        .expect(400);
    }
    for (const expectedVersion of [undefined, null, -1, 0.5, '0', true]) {
      await request(http)
        .patch(documentUrl)
        .send({ expectedVersion, dueDate: null })
        .expect(400);
    }
    await request(http)
      .patch(groupUrl)
      .send({
        expectedVersion: 0,
        status: 'completed',
        reason: 'Нет учёта',
        confirmIncompleteProduction: 'false',
      })
      .expect(400);
    await request(http)
      .patch(groupUrl)
      .send({ expectedVersion: 0, status: null })
      .expect(400);
    await request(http)
      .patch(`/api/order-groups/${group.id}`)
      .send({ dueDate: '2026-09-10' })
      .expect(400);
    await request(http)
      .patch(`/api/orders/${document.id}`)
      .send({ status: 'completed' })
      .expect(400);
    await request(http)
      .patch(`/api/orders/${document.id}`)
      .send({ managementVersion: 90 })
      .expect(400);
    await request(http)
      .patch('/api/order-management/settings')
      .send({ timeZone: 'Mars/Olympus' })
      .expect(400);
    const response = await request(http)
      .patch('/api/order-management/settings')
      .send({ timeZone: 'Asia/Tokyo' })
      .expect(200);
    expect(response.body).toMatchObject({ id: 1, timeZone: 'Asia/Tokyo' });
    await request(http)
      .patch('/api/order-management/settings')
      .send({ timeZone: 'Europe/Moscow' })
      .expect(200);
    await request(http)
      .patch(groupUrl)
      .send({ expectedVersion: 0, dueDate: '2028-02-29' })
      .expect(200);
  });

  it('validates status scope, retains archived assignments and snapshots after renaming', async () => {
    const { document, documentUrl, groupUrl } = await fixture();
    const customStatusId = await status('document');
    await request(http)
      .patch(groupUrl)
      .send({ expectedVersion: 0, customStatusId })
      .expect(400);
    await request(http)
      .patch(documentUrl)
      .send({ expectedVersion: 0, customStatusId: randomUUID() })
      .expect(400);
    await request(http)
      .patch(documentUrl)
      .send({ expectedVersion: 0, customStatusId })
      .expect(200);
    await request(http)
      .patch(`/api/order-management/statuses/${customStatusId}`)
      .send({ name: 'Новое имя' })
      .expect(200);
    await request(http)
      .post(`/api/order-management/statuses/${customStatusId}/archive`)
      .expect(201);
    const response = await request(http).get(documentUrl).expect(200);
    expect(response.body).toMatchObject({
      customStatusId,
      customStatus: {
        name: 'Новое имя',
        archivedAt: expect.any(String) as unknown,
      },
    });
    const events = await source.manager.findBy(Event, { orderId: document.id });
    expect(events[0].after).toEqual({ customStatusId, name: 'Ожидание' });
    await request(http)
      .patch(documentUrl)
      .send({ expectedVersion: 1, dueDate: '2026-09-11', customStatusId })
      .expect(200);
    await request(http)
      .patch(documentUrl)
      .send({ expectedVersion: 2, customStatusId: null })
      .expect(200);
    await request(http)
      .patch(documentUrl)
      .send({ expectedVersion: 3, customStatusId })
      .expect(400);
    await request(http)
      .delete(`/api/order-management/statuses/${customStatusId}`)
      .expect(409);
    const unused = await status('group');
    await request(http)
      .delete(`/api/order-management/statuses/${unused}`)
      .expect(200);
  });

  it('validates custom status fields and includes archived entries in lists', async () => {
    for (const dto of [
      { scope: 'other', name: 'Имя', color: '#aabbcc' },
      { scope: 'group', name: '   ', color: '#aabbcc' },
      { scope: 'group', name: 'Имя', color: 'red' },
      { scope: 'group', name: 'Имя', color: '#aabbcc', position: -1 },
    ])
      await request(http)
        .post('/api/order-management/statuses')
        .send(dto)
        .expect(400);
    const id = await status('group');
    await request(http)
      .patch(`/api/order-management/statuses/${id}`)
      .send({ scope: 'document' })
      .expect(400);
    await request(http)
      .patch(`/api/order-management/statuses/${id}`)
      .send({ name: null })
      .expect(400);
    await request(http)
      .patch(`/api/order-management/statuses/${id}`)
      .send({})
      .expect(200);
    await request(http)
      .post(`/api/order-management/statuses/${id}/archive`)
      .expect(201);
    const response = await request(http)
      .get('/api/order-management/statuses?scope=group')
      .expect(200);
    expect(response.body).toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({
          id,
          archivedAt: expect.any(String) as unknown,
        }),
      ]) as unknown,
    });
  });

  it('changes a group custom status independently of lifecycle and pricing', async () => {
    const { document, groupUrl } = await fixture();
    const customStatusId = await status('group');
    await request(http).get('/api/order-management/settings').expect(200);
    const initial = await request(http).get(groupUrl).expect(200);
    expect(initial.body).toMatchObject({
      status: 'draft',
      managementVersion: 0,
    });
    const changed = await request(http)
      .patch(groupUrl)
      .send({ expectedVersion: 0, customStatusId })
      .expect(200);
    expect(changed.body).toMatchObject({
      status: 'draft',
      customStatusId,
      managementVersion: 1,
    });
    expect(
      (await source.manager.findOneByOrFail(Document, { id: document.id }))
        .totalPrice,
    ).toBe(123.45);
    await request(http)
      .patch(groupUrl)
      .send({ expectedVersion: 1, customStatusId: null })
      .expect(200);
  });

  it('applies lifecycle checks through the old PATCH and preserves stored prices on start', async () => {
    const { group, document, groupUrl } = await fixture();
    const legacy = `/api/order-groups/${group.id}`;
    await request(http)
      .patch(legacy)
      .send({ status: 'in_production' })
      .expect(400);
    await request(http)
      .patch(legacy)
      .send({ status: 'in_production', expectedVersion: 0, comment: 'Запуск' })
      .expect(200);
    expect(
      (await source.manager.findOneByOrFail(Document, { id: document.id }))
        .totalPrice,
    ).toBe(123.45);
    await request(http)
      .patch(legacy)
      .send({ status: 'draft', expectedVersion: 1 })
      .expect(400);
    await request(http)
      .patch(legacy)
      .send({ status: 'completed', expectedVersion: 1 })
      .expect(400);
    await request(http)
      .patch(groupUrl)
      .send({
        status: 'completed',
        expectedVersion: 1,
        confirmIncompleteProduction: true,
        reason: 'Без полного учёта',
      })
      .expect(200);
    await request(http)
      .patch(legacy)
      .send({ status: 'in_production', expectedVersion: 2 })
      .expect(400);
    await request(http)
      .patch(legacy)
      .send({
        status: 'in_production',
        expectedVersion: 2,
        reason: 'Переделка',
      })
      .expect(200);
    await request(http)
      .patch(groupUrl)
      .send({ status: 'cancelled', expectedVersion: 3 })
      .expect(200);
    await request(http)
      .patch(groupUrl)
      .send({
        status: 'completed',
        expectedVersion: 4,
        reason: 'Обход',
        confirmIncompleteProduction: true,
      })
      .expect(400);
    await request(http)
      .patch(groupUrl)
      .send({
        status: 'in_production',
        expectedVersion: 4,
        reason: 'Возобновить',
      })
      .expect(200);
    expect(
      await source.manager.countBy(Event, {
        orderGroupId: group.id,
        type: 'lifecycle_changed',
      }),
    ).toBe(5);
  });

  it('rolls back all fields and versions if event writing fails', async () => {
    const { group, groupUrl } = await fixture();
    const spy = jest
      .spyOn(journal, 'record')
      .mockRejectedValueOnce(new Error('Journal unavailable'));
    try {
      await request(http)
        .patch(groupUrl)
        .send({ expectedVersion: 0, dueDate: '2026-09-10' })
        .expect(500);
    } finally {
      spy.mockRestore();
    }
    expect(
      await source.manager.findOneByOrFail(Group, { id: group.id }),
    ).toMatchObject({ dueDate: null, managementVersion: 0 });
    expect(
      await source.manager.countBy(Event, { orderGroupId: group.id }),
    ).toBe(0);
  });

  it('keeps management changes made while a legacy document update is calculating', async () => {
    const { document, documentUrl } = await fixture();
    await source.query(
      `INSERT INTO order_items (id, quantity, snapshot, "orderId") VALUES (?, 1, '{}', ?)`,
      [randomUUID(), document.id],
    );
    let release!: (prices: number[]) => void;
    let started!: () => void;
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    const calculation = new Promise<number[]>((resolve) => {
      release = resolve;
    });
    const spy = jest
      .spyOn(pricing, 'calculateCustomerPrices')
      .mockImplementationOnce(() => {
        started();
        return calculation;
      });
    const editing = request(http)
      .patch(`/api/orders/${document.id}`)
      .send({ comment: 'Edited' })
      .then((response) => response);
    try {
      await entered;
      await request(http)
        .patch(documentUrl)
        .send({ expectedVersion: 0, dueDate: '2026-09-18' })
        .expect(200);
      release([50]);
      expect((await editing).status).toBe(200);
      expect(
        await source.manager.findOneByOrFail(Document, { id: document.id }),
      ).toMatchObject({
        dueDate: '2026-09-18',
        managementVersion: 1,
        comment: 'Edited',
        totalPrice: 50,
      });
    } finally {
      release([50]);
      spy.mockRestore();
    }
  });

  it('does not partially delete an object when its deletion event fails', async () => {
    const { group, document } = await fixture();
    const spy = jest
      .spyOn(journal, 'record')
      .mockRejectedValueOnce(new Error('Journal unavailable'));
    try {
      await request(http).delete(`/api/orders/${document.id}`).expect(500);
    } finally {
      spy.mockRestore();
    }
    expect(
      await source.manager.findOneByOrFail(Document, { id: document.id }),
    ).toMatchObject({ managementVersion: 0 });
    expect(
      await source.manager.findOneByOrFail(Group, { id: group.id }),
    ).toMatchObject({ managementVersion: 0 });
  });

  it('does not copy management state and retains deletion snapshots in paginated history', async () => {
    const { group, document, documentUrl } = await fixture();
    const customStatusId = await status('document');
    await request(http)
      .patch(documentUrl)
      .send({ expectedVersion: 0, customStatusId, dueDate: '2026-09-12' })
      .expect(200);
    const copy = await request(http)
      .post(`/api/orders/${document.id}/copy`)
      .send({ name: 'Копия' })
      .expect(201);
    expect(copy.body).toMatchObject({
      dueDate: null,
      customStatusId: null,
      managementVersion: 0,
    });
    const copiedId = (copy.body as { id: string }).id;
    expect(await source.manager.countBy(Event, { orderId: copiedId })).toBe(0);
    await request(http).delete(`/api/orders/${document.id}`).expect(200);
    await request(http).delete(`/api/order-groups/${group.id}`).expect(200);
    const deleted = await source.manager.findBy(Event, {
      type: 'document_deleted',
    });
    expect(deleted).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orderId: null,
          orderGroupId: null,
          targetSnapshot: {
            orderNumber: group.orderNumber,
            documentNumber: 1,
            documentName: 'Фасады',
          },
        }),
      ]),
    );
    const orphan = await source.manager.findOneOrFail(Document, {
      where: { id: copiedId },
      relations: { orderGroup: true },
    });
    expect(orphan.orderGroup).toBeNull();
    expect(orphan.managementVersion).toBe(1);
    const page = await request(http)
      .get('/api/order-management/history?limit=1')
      .expect(200);
    expect(page.body).toMatchObject({
      items: [expect.any(Object)],
      meta: { nextOffset: 1 },
    });
    const next = await request(http)
      .get('/api/order-management/history?limit=1&offset=1')
      .expect(200);
    expect((page.body as { items: { id: string }[] }).items[0].id).not.toBe(
      (next.body as { items: { id: string }[] }).items[0].id,
    );
    await request(http)
      .get('/api/order-management/history?limit=101')
      .expect(400);
    expect(await source.query('PRAGMA foreign_key_check')).toEqual([]);
  });
});
