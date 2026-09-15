/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import type { Notification } from '../src/modules/notifications/entities/notification.entity';
import type { NotificationSchedulerService } from '../src/modules/notifications/notification-scheduler.service';
import type { OrderManagementEvent } from '../src/modules/order-management/entities/order-management-event.entity';
import type { OrderGroup } from '../src/modules/order-groups/entities/order-group.entity';
import type { Order } from '../src/modules/orders/entities/order.entity';
import type { ProductionBoard } from '../src/modules/production-boards/entities/production-board.entity';

describe('Order management MVP acceptance (SQLite)', () => {
  let app: INestApplication;
  let http: Server;
  let source: DataSource;
  let directory: string;
  let Group: typeof OrderGroup;
  let Document: typeof Order;
  let Event: typeof OrderManagementEvent;
  let Message: typeof Notification;
  let scheduler: NotificationSchedulerService;
  const oldKind = process.env.DB_TYPE;
  const oldPath = process.env.DB_PATH;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'avocado-mvp-acceptance-'));
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = join(directory, 'acceptance.sqlite');
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
    Message = (
      require('../src/modules/notifications/entities/notification.entity') as typeof import('../src/modules/notifications/entities/notification.entity')
    ).Notification;
    const { NotificationSchedulerService: Scheduler } =
      require('../src/modules/notifications/notification-scheduler.service') as typeof import('../src/modules/notifications/notification-scheduler.service');
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
    scheduler = app.get(Scheduler);
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
    if (directory) await rm(directory, { recursive: true, force: true });
    if (oldKind === undefined) delete process.env.DB_TYPE;
    else process.env.DB_TYPE = oldKind;
    if (oldPath === undefined) delete process.env.DB_PATH;
    else process.env.DB_PATH = oldPath;
  });

  async function waitForScheduler() {
    while (scheduler.state().running)
      await new Promise((resolve) => setTimeout(resolve, 10));
  }

  it('completes the documented workflow and retains audit data after deletion', async () => {
    const group = await source.manager.save(
      Group,
      source.manager.create(Group, {
        orderNumber: `MVP-${randomUUID()}`,
        customer: { name: 'Приёмка' },
      }),
    );
    const documents = await source.manager.save(
      Document,
      ['Фасады', 'Корпус'].map((name, index) =>
        source.manager.create(Document, {
          name,
          documentNumber: index + 1,
          orderGroup: group,
          totalPrice: 100 + index,
        }),
      ),
    );
    const statusResponse = await request(http)
      .post('/api/order-management/statuses')
      .send({ scope: 'group', name: 'Согласован', color: '#336699' })
      .expect(201);
    const customStatusId = statusResponse.body.id as string;
    await request(http)
      .patch(`/api/order-groups/${group.id}/management`)
      .send({
        expectedVersion: 0,
        customStatusId,
        dueDate: '2028-02-29',
      })
      .expect(200);

    const boardResponse = await request(http)
      .post('/api/production-boards')
      .send({
        name: 'Приёмочная доска',
        stages: [
          {
            name: 'Очередь',
            color: '#999999',
            kind: 'queue',
            progressPercent: 0,
          },
          {
            name: 'Работа',
            color: '#3366ff',
            kind: 'active',
            progressPercent: 50,
          },
          {
            name: 'Готово',
            color: '#33aa66',
            kind: 'done',
            progressPercent: 100,
          },
        ],
        initialStageIndex: 0,
      })
      .expect(201);
    const board = boardResponse.body as ProductionBoard;

    const firstCard = await request(http)
      .post(`/api/production-boards/${board.id}/cards`)
      .send({
        orderId: documents[0].id,
        expectedBoardVersion: 0,
        expectedGroupVersion: 1,
      })
      .expect(201);
    const secondCard = await request(http)
      .post(`/api/production-boards/${board.id}/cards`)
      .send({
        orderId: documents[1].id,
        expectedBoardVersion: 1,
        expectedGroupVersion: 2,
      })
      .expect(201);

    await request(http)
      .patch(`/api/order-groups/${group.id}/management`)
      .send({ expectedVersion: 3, status: 'in_production' })
      .expect(200);
    const rule = await request(http)
      .post('/api/notifications/rules')
      .send({
        name: 'Документ перешёл в работу',
        enabled: true,
        scope: 'document',
        trigger: 'stage_changed',
        conditions: { toStageIn: [board.stages[1].id] },
        repeat: 'once',
        messageTemplate: 'Документ {{document.name}} {{document.link}}',
        severity: 'info',
      })
      .expect(201);
    expect(rule.body).toMatchObject({ enabled: true, revision: 1 });

    const move = (
      card: { body: { id: string } },
      stage: string,
      boardVersion: number,
      groupVersion: number,
    ) =>
      request(http).post(`/api/production-cards/${card.body.id}/move`).send({
        targetStageId: stage,
        expectedCardVersion: 0,
        expectedBoardVersion: boardVersion,
        expectedGroupVersion: groupVersion,
      });
    await move(firstCard, board.stages[1].id, 2, 4).expect(201);
    await move(secondCard, board.stages[2].id, 3, 5).expect(201);

    const production = await request(http)
      .get(`/api/order-groups/${group.id}/production`)
      .expect(200);
    expect(production.body).toMatchObject({
      documentCount: 2,
      trackedCount: 2,
      progressPercent: 75,
      productionComplete: false,
    });
    expect(production.body.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ effectiveDueDate: '2028-02-29' }),
      ]),
    );

    await waitForScheduler();
    await scheduler.run();
    await scheduler.run();
    const feed = await request(http)
      .get('/api/notifications?limit=20')
      .expect(200);
    const created = (
      feed.body.items as Array<{ id: string; ruleId: string }>
    ).filter((item) => item.ruleId === rule.body.id);
    expect(created).toHaveLength(1);
    await request(http)
      .patch(`/api/notifications/${created[0].id}/read`)
      .send({ read: true })
      .expect(200);

    const copy = await request(http)
      .post(`/api/orders/${documents[0].id}/copy`)
      .send({ name: 'Копия без производства' })
      .expect(201);
    expect(copy.body).toMatchObject({
      dueDate: null,
      customStatusId: null,
      managementVersion: 0,
    });
    const copiedProduction = await request(http)
      .get(`/api/order-groups/${group.id}/production`)
      .expect(200);
    expect(copiedProduction.body).toMatchObject({
      documentCount: 3,
      trackedCount: 2,
      progressPercent: 50,
    });

    await request(http)
      .post(`/api/order-management/statuses/${customStatusId}/archive`)
      .expect(201);
    await request(http)
      .delete(`/api/order-management/statuses/${customStatusId}`)
      .expect(409);
    await request(http)
      .post(`/api/production-boards/${board.id}/archive`)
      .send({ expectedVersion: 4 })
      .expect(409);

    await request(http)
      .patch(`/api/order-groups/${group.id}/management`)
      .send({
        expectedVersion: 6,
        status: 'completed',
        confirmIncompleteProduction: true,
        reason: 'Закрытие приёмки без полного производственного учёта',
      })
      .expect(200);
    await move(firstCard, board.stages[2].id, 4, 7).expect(409);
    await request(http)
      .patch(`/api/order-groups/${group.id}/management`)
      .send({
        expectedVersion: 7,
        status: 'in_production',
        reason: 'Возобновление',
      })
      .expect(200);
    await request(http)
      .patch(`/api/order-groups/${group.id}/management`)
      .send({ expectedVersion: 8, status: 'cancelled' })
      .expect(200);
    await request(http)
      .patch(`/api/order-groups/${group.id}/management`)
      .send({
        expectedVersion: 9,
        status: 'in_production',
        reason: 'Повторное возобновление',
      })
      .expect(200);

    await request(http).delete(`/api/order-groups/${group.id}`).expect(200);
    expect(
      await source.manager.countBy(Event, { orderGroupId: group.id }),
    ).toBe(0);
    const retainedEvents = await source.manager.findBy(Event, {
      orderGroupId: null,
    });
    expect(retainedEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'group_deleted',
          targetSnapshot: expect.objectContaining({
            orderNumber: group.orderNumber,
          }),
        }),
      ]),
    );
    expect(
      await source.manager.findOneByOrFail(Message, { id: created[0].id }),
    ).toMatchObject({
      orderGroupId: null,
      orderId: documents[0].id,
      readAt: expect.any(Date),
      resolvedAt: expect.any(Date),
    });
  }, 30000);

  it('accepts only one retry with the same versions and records one stage event', async () => {
    const group = await source.manager.save(
      Group,
      source.manager.create(Group, {
        orderNumber: `RACE-${randomUUID()}`,
        customer: {},
      }),
    );
    const document = await source.manager.save(
      Document,
      source.manager.create(Document, {
        name: 'Конкурентный документ',
        documentNumber: 1,
        orderGroup: group,
      }),
    );
    const board = (
      await request(http)
        .post('/api/production-boards')
        .send({
          name: `Race ${randomUUID()}`,
          stages: [
            {
              name: 'Очередь',
              color: '#999999',
              kind: 'queue',
              progressPercent: 0,
            },
            {
              name: 'Работа',
              color: '#3366ff',
              kind: 'active',
              progressPercent: 50,
            },
            {
              name: 'Готово',
              color: '#33aa66',
              kind: 'done',
              progressPercent: 100,
            },
          ],
          initialStageIndex: 0,
        })
        .expect(201)
    ).body as ProductionBoard;
    const card = await request(http)
      .post(`/api/production-boards/${board.id}/cards`)
      .send({
        orderId: document.id,
        expectedBoardVersion: 0,
        expectedGroupVersion: 0,
      })
      .expect(201);
    await request(http)
      .patch(`/api/order-groups/${group.id}/management`)
      .send({ expectedVersion: 1, status: 'in_production' })
      .expect(200);
    const attempts = await Promise.all([
      request(http).post(`/api/production-cards/${card.body.id}/move`).send({
        targetStageId: board.stages[1].id,
        expectedCardVersion: 0,
        expectedBoardVersion: 1,
        expectedGroupVersion: 2,
      }),
      request(http).post(`/api/production-cards/${card.body.id}/move`).send({
        targetStageId: board.stages[1].id,
        expectedCardVersion: 0,
        expectedBoardVersion: 1,
        expectedGroupVersion: 2,
      }),
    ]);
    expect(attempts.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(
      await source.manager.countBy(Event, {
        orderId: document.id,
        type: 'stage_changed',
      }),
    ).toBe(1);
  });

  it('measures the agreed 10k documents, 100 rules and 200 cards dataset', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const group = await source.manager.save(
      Group,
      source.manager.create(Group, {
        orderNumber: `PERF-${randomUUID()}`,
        customer: {},
        dueDate: today,
      }),
    );
    await source.query(
      `WITH RECURSIVE seq(x) AS (
         SELECT 1 UNION ALL SELECT x + 1 FROM seq WHERE x < 10000
       )
       INSERT INTO orders (id, name, "documentNumber", "orderGroupId")
       SELECT printf('10000000-0000-4000-8000-%012d', x), 'Performance', x, ?
       FROM seq`,
      [group.id],
    );
    const board = (
      await request(http)
        .post('/api/production-boards')
        .send({
          name: `Performance ${randomUUID()}`,
          stages: [
            {
              name: 'Очередь',
              color: '#999999',
              kind: 'queue',
              progressPercent: 0,
            },
            {
              name: 'Работа',
              color: '#3366ff',
              kind: 'active',
              progressPercent: 50,
            },
            {
              name: 'Готово',
              color: '#33aa66',
              kind: 'done',
              progressPercent: 100,
            },
          ],
          initialStageIndex: 0,
        })
        .expect(201)
    ).body as ProductionBoard;
    await source.query(
      `WITH RECURSIVE seq(x) AS (
         SELECT 1 UNION ALL SELECT x + 1 FROM seq WHERE x < 200
       )
       INSERT INTO production_cards
         (id, "orderId", "stageId", position, "progressPercent", "enteredStageAt", version)
       SELECT printf('20000000-0000-4000-8000-%012d', x),
              printf('10000000-0000-4000-8000-%012d', x), ?, x - 1, 0,
              CURRENT_TIMESTAMP, 0
       FROM seq`,
      [board.stages[0].id],
    );
    const { NotificationRule } =
      require('../src/modules/notifications/entities/notification-rule.entity') as typeof import('../src/modules/notifications/entities/notification-rule.entity');
    await source.manager.getRepository(NotificationRule).save(
      Array.from({ length: 100 }, (_, index) => ({
        name: `Performance ${index}`,
        enabled: true,
        revision: 1,
        scope: 'group' as const,
        trigger: 'due_soon' as const,
        conditions: { days: 0, systemStatusIn: ['completed' as const] },
        repeat: 'once' as const,
        messageTemplate: 'Заказ {{order.number}}',
        severity: 'info' as const,
        activatedAt: new Date(0),
      })),
    );

    await waitForScheduler();
    const schedulerStarted = performance.now();
    await scheduler.run();
    const schedulerDurationMs = performance.now() - schedulerStarted;
    const firstPageStarted = performance.now();
    const firstPage = await request(http)
      .get(`/api/production-boards/${board.id}/cards?limit=100`)
      .expect(200);
    const firstPageDurationMs = performance.now() - firstPageStarted;
    const secondPageStarted = performance.now();
    const secondPage = await request(http)
      .get(
        `/api/production-boards/${board.id}/cards?limit=100&cursor=${encodeURIComponent(firstPage.body.meta.nextCursor as string)}`,
      )
      .expect(200);
    const secondPageDurationMs = performance.now() - secondPageStarted;

    expect(firstPage.body.items).toHaveLength(100);
    expect(secondPage.body.items).toHaveLength(100);
    expect(schedulerDurationMs).toBeLessThan(300000);
    expect(firstPageDurationMs).toBeLessThan(500);
    expect(secondPageDurationMs).toBeLessThan(500);
    console.info(
      `OM-12 metrics: scheduler=${schedulerDurationMs.toFixed(1)}ms, cardsPage1=${firstPageDurationMs.toFixed(1)}ms, cardsPage2=${secondPageDurationMs.toFixed(1)}ms`,
    );
  }, 300000);
});
