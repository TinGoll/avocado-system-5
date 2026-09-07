/* eslint-disable @typescript-eslint/no-require-imports */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import type { ProductionBoard } from '../src/modules/production-boards/entities/production-board.entity';
import type { ProductionStage } from '../src/modules/production-boards/entities/production-stage.entity';

describe('Production board configuration HTTP (SQLite)', () => {
  let app: INestApplication;
  let http: Server;
  let source: DataSource;
  let directory: string;
  let Board: typeof ProductionBoard;
  let Stage: typeof ProductionStage;
  const oldKind = process.env.DB_TYPE;
  const oldPath = process.env.DB_PATH;
  const definition = () => ({
    name: 'Производство',
    initialStageIndex: 0,
    stages: [
      { name: 'Очередь', color: '#aabbcc', kind: 'queue', progressPercent: 0 },
      {
        name: 'Запасная очередь',
        color: '#aabbcc',
        kind: 'queue',
        progressPercent: 0,
      },
      { name: 'Работа', color: '#112233', kind: 'active', progressPercent: 50 },
      { name: 'Готово', color: '#009900', kind: 'done', progressPercent: 100 },
    ],
  });

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'avocado-boards-'));
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = join(directory, 'test.sqlite');
    const { AppModule } =
      require('../src/app.module') as typeof import('../src/app.module');
    const { createAppValidationPipe } =
      require('../src/common/pipes/app-validation.pipe') as typeof import('../src/common/pipes/app-validation.pipe');
    const { WrapItemsInterceptor } =
      require('../src/common/interceptors/wrap-items.interceptor') as typeof import('../src/common/interceptors/wrap-items.interceptor');
    Board = (
      require('../src/modules/production-boards/entities/production-board.entity') as typeof import('../src/modules/production-boards/entities/production-board.entity')
    ).ProductionBoard;
    Stage = (
      require('../src/modules/production-boards/entities/production-stage.entity') as typeof import('../src/modules/production-boards/entities/production-stage.entity')
    ).ProductionStage;
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
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
    if (directory) await rm(directory, { recursive: true, force: true });
    if (oldKind === undefined) delete process.env.DB_TYPE;
    else process.env.DB_TYPE = oldKind;
    if (oldPath === undefined) delete process.env.DB_PATH;
    else process.env.DB_PATH = oldPath;
  });

  async function create() {
    const response = await request(http)
      .post('/api/production-boards')
      .send(definition())
      .expect(201);
    const board = response.body as ProductionBoard;
    return { board, url: `/api/production-boards/${board.id}` };
  }

  it('creates a complete board and lists it without schema drift', async () => {
    const { board, url } = await create();
    expect(board).toMatchObject({
      version: 0,
      initialStageId: board.stages[0].id,
      archivedAt: null,
      description: null,
    });
    expect(board.stages.map((stage) => stage.position)).toEqual([0, 1, 2, 3]);
    expect(
      board.stages.every(
        (stage) => stage.boardId === board.id && stage.usedAt === null,
      ),
    ).toBe(true);
    const detail = await request(http).get(url).expect(200);
    expect(detail.body).toEqual(board);
    const list = await request(http).get('/api/production-boards').expect(200);
    expect(
      (list.body as { items: ProductionBoard[] }).items.some(
        (item) => item.id === board.id,
      ),
    ).toBe(true);
    expect((await source.driver.createSchemaBuilder().log()).upQueries).toEqual(
      [],
    );
  });

  it('rolls back all inserted stages if the completed board has no done stage', async () => {
    const before = {
      boards: await source.manager.count(Board),
      stages: await source.manager.count(Stage),
    };
    const dto = definition();
    dto.stages.pop();
    await request(http).post('/api/production-boards').send(dto).expect(400);
    expect(await source.manager.count(Board)).toBe(before.boards);
    expect(await source.manager.count(Stage)).toBe(before.stages);
    expect(
      await source.query(
        'SELECT id FROM production_boards WHERE "initialStageId" IS NULL',
      ),
    ).toEqual([]);
  });

  it('validates nested fields, initial index, progress ranges and JSON versions', async () => {
    for (const initialStageIndex of [2, 99, -1, '0', null])
      await request(http)
        .post('/api/production-boards')
        .send({ ...definition(), initialStageIndex })
        .expect(400);
    for (const [kind, progressPercent] of [
      ['queue', 1],
      ['active', 0],
      ['active', 100],
      ['done', 99],
      ['other', 50],
      ['active', 1.5],
    ]) {
      const dto = definition();
      await request(http)
        .post('/api/production-boards')
        .send({
          ...dto,
          stages: [
            dto.stages[0],
            { name: 'Invalid', color: '#123456', kind, progressPercent },
            dto.stages[3],
          ],
        })
        .expect(400);
    }
    await request(http)
      .post('/api/production-boards')
      .send({ ...definition(), name: '  ' })
      .expect(400);
    const { url } = await create();
    for (const expectedVersion of [null, '0', -1, undefined])
      await request(http)
        .patch(url)
        .send({ expectedVersion, name: 'New' })
        .expect(400);
    await request(http)
      .patch(url)
      .send({ expectedVersion: 0, initialStageId: null })
      .expect(400);
    await request(http)
      .patch(url)
      .send({ expectedVersion: 0, archivedAt: new Date().toISOString() })
      .expect(400);
  });

  it('allows one concurrent settings change and rolls back stale requests', async () => {
    const { url } = await create();
    const responses = await Promise.all([
      request(http).patch(url).send({ expectedVersion: 0, name: 'First' }),
      request(http).patch(url).send({ expectedVersion: 0, name: 'Second' }),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    const response = await request(http)
      .patch(url)
      .send({ expectedVersion: 1, description: 'Описание' })
      .expect(200);
    expect(response.body).toMatchObject({
      version: 2,
      description: 'Описание',
    });
    await request(http)
      .patch(url)
      .send({ expectedVersion: 2, description: null })
      .expect(200);
  });

  it('rejects foreign and missing stage references without changing the board version', async () => {
    const { board, url } = await create();
    const other = await create();
    await request(http)
      .patch(url)
      .send({ expectedVersion: 0, initialStageId: other.board.initialStageId })
      .expect(404);
    await request(http)
      .patch(url)
      .send({ expectedVersion: 0, initialStageId: randomUUID() })
      .expect(404);
    await request(http)
      .patch(`${url}/stages/${other.board.stages[2].id}`)
      .send({ expectedVersion: 0, name: 'Foreign' })
      .expect(404);
    await request(http)
      .patch(url)
      .send({ expectedVersion: 0, initialStageId: board.stages[2].id })
      .expect(400);
    expect(
      await source.manager.findOneByOrFail(Board, { id: board.id }),
    ).toMatchObject({ version: 0, initialStageId: board.initialStageId });
  });

  it('requires another queue to archive the initial stage and normalizes active positions', async () => {
    const { board, url } = await create();
    const first = board.stages[0];
    const replacement = board.stages[1];
    await request(http)
      .post(`${url}/stages/${first.id}/archive`)
      .send({ expectedVersion: 0 })
      .expect(400);
    await request(http)
      .post(`${url}/stages/${first.id}/archive`)
      .send({ expectedVersion: 0, initialStageId: first.id })
      .expect(400);
    const response = await request(http)
      .post(`${url}/stages/${first.id}/archive`)
      .send({ expectedVersion: 0, initialStageId: replacement.id })
      .expect(201);
    const updated = response.body as ProductionBoard;
    expect(updated.initialStageId).toBe(replacement.id);
    expect(
      updated.stages.find((stage) => stage.id === first.id)?.archivedAt,
    ).not.toBeNull();
    expect(
      updated.stages
        .filter((stage) => !stage.archivedAt)
        .map((stage) => stage.position),
    ).toEqual([0, 1, 2]);
    await request(http)
      .patch(`${url}/stages/${first.id}`)
      .send({ expectedVersion: 1, name: 'Archived' })
      .expect(409);
    await request(http)
      .post(`${url}/stages/${board.stages[3].id}/archive`)
      .send({ expectedVersion: 1 })
      .expect(400);
    expect(
      (await source.manager.findOneByOrFail(Board, { id: board.id })).version,
    ).toBe(1);
  });

  it('freezes used kind/progress, preserves use timestamps during reorder and archives used stages', async () => {
    const { board, url } = await create();
    const response = await request(http)
      .post(`${url}/stages`)
      .send({
        expectedVersion: 0,
        name: 'Вторая работа',
        color: '#123456',
        kind: 'active',
        progressPercent: 75,
      })
      .expect(201);
    const expanded = response.body as ProductionBoard;
    const active = board.stages[2];
    const usedAt = new Date('2026-09-07T10:00:00.000Z');
    await source.manager.update(Stage, active.id, { usedAt });
    await request(http)
      .patch(`${url}/stages/${active.id}`)
      .send({ expectedVersion: 1, progressPercent: 60 })
      .expect(409);
    await request(http)
      .patch(`${url}/stages/${active.id}`)
      .send({ expectedVersion: 1, kind: 'done', progressPercent: 100 })
      .expect(409);
    await request(http)
      .patch(`${url}/stages/${active.id}`)
      .send({ expectedVersion: 1, name: 'Переименовано', color: '#ffffff' })
      .expect(200);
    const ids = expanded.stages.map((stage) => stage.id).reverse();
    await request(http)
      .put(`${url}/stage-order`)
      .send({ expectedVersion: 2, stageIds: ids })
      .expect(200);
    expect(
      await source.manager.findOneByOrFail(Stage, { id: active.id }),
    ).toMatchObject({
      usedAt,
      kind: 'active',
      progressPercent: 50,
      name: 'Переименовано',
    });
    await request(http)
      .delete(`${url}/stages/${active.id}`)
      .send({ expectedVersion: 3 })
      .expect(409);
    await request(http)
      .post(`${url}/stages/${active.id}/archive`)
      .send({ expectedVersion: 3 })
      .expect(201);
    expect(
      (await source.manager.findOneByOrFail(Stage, { id: active.id })).usedAt,
    ).toEqual(usedAt);
  });

  it('requires complete active-only reorder, supports unused edits/deletion and locks archived boards', async () => {
    const { board, url } = await create();
    const ids = board.stages.map((stage) => stage.id);
    for (const stageIds of [
      ids.slice(1),
      [ids[0], ids[0], ids[2], ids[3]],
      [...ids.slice(0, 3), randomUUID()],
    ])
      await request(http)
        .put(`${url}/stage-order`)
        .send({ expectedVersion: 0, stageIds })
        .expect(400);
    await request(http)
      .patch(`${url}/stages/${ids[1]}`)
      .send({ expectedVersion: 0, kind: 'active', progressPercent: 25 })
      .expect(200);
    await request(http)
      .delete(`${url}/stages/${ids[1]}`)
      .send({ expectedVersion: 1 })
      .expect(200);
    await request(http)
      .delete(`${url}/stages/${ids[3]}`)
      .send({ expectedVersion: 2 })
      .expect(400);
    await request(http)
      .post(`${url}/archive`)
      .send({ expectedVersion: 2 })
      .expect(201);
    await request(http)
      .patch(url)
      .send({ expectedVersion: 3, name: 'Blocked' })
      .expect(409);
    await request(http)
      .post(`${url}/stages`)
      .send({ expectedVersion: 3, ...definition().stages[0] })
      .expect(409);
    const saved = await request(http).get(url).expect(200);
    expect(saved.body).toMatchObject({ version: 3 });
    expect((saved.body as ProductionBoard).archivedAt).not.toBeNull();
  });

  it('serializes board and order-management transactions sharing SQLite', async () => {
    const { url } = await create();
    const responses = await Promise.all([
      request(http).patch(url).send({ expectedVersion: 0, name: 'Concurrent' }),
      request(http)
        .patch('/api/order-management/settings')
        .send({ timeZone: 'Europe/Moscow' }),
    ]);
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(await source.query('PRAGMA foreign_key_check')).toEqual([]);
  });
});
