/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { DataSource } from 'typeorm';

import { createAppValidationPipe } from '../src/common/pipes/app-validation.pipe';

describe('Production operations flow (SQLite)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let temporaryDirectory: string;

  beforeAll(async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), 'avocado-operations-'));
    process.env.DB_TYPE = 'sqlite';
    process.env.DB_PATH = join(temporaryDirectory, 'avocado.sqlite');

    const { AppModule } =
      require('../src/app.module') as typeof import('../src/app.module');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(createAppValidationPipe());
    await app.init();

    const { DataSource: DataSourceToken } =
      require('typeorm') as typeof import('typeorm');
    dataSource = app.get(DataSourceToken);
  });

  afterAll(async () => {
    await app?.close();
    await rm(temporaryDirectory, { recursive: true, force: true });
    delete process.env.DB_TYPE;
    delete process.env.DB_PATH;
  });

  it('exposes template variable metadata by scope', async () => {
    const formulaResponse = await request(app.getHttpServer())
      .get('/api/template-variables')
      .query({ scope: 'production-operation-formula' })
      .expect(200);
    const nameResponse = await request(app.getHttpServer())
      .get('/api/template-variables')
      .query({ scope: 'production-operation-name' })
      .expect(200);
    const formulaVariables = formulaResponse.body.variables as {
      path: string;
      valueType: string;
    }[];

    expect(
      formulaVariables.every(({ valueType }) => valueType === 'number'),
    ).toBe(true);
    expect(formulaVariables).not.toContainEqual(
      expect.objectContaining({ path: 'item.name' }),
    );
    expect(nameResponse.body.variables).toContainEqual(
      expect.objectContaining({
        path: 'item.name',
        label: 'Название продукта',
      }),
    );
    expect(nameResponse.body.variables[0]).not.toHaveProperty('scopes');
  });

  it('rejects an unknown template variable scope', () =>
    request(app.getHttpServer())
      .get('/api/template-variables')
      .query({ scope: 'unknown' })
      .expect(400));

  it('runs a panel operation from setup through snapshot and manual recalculation', async () => {
    const operationResponse = await request(app.getHttpServer())
      .post('/api/production-operations')
      .send({
        name: 'Изготовление филёнки',
        calculationMethod: 'area',
        calculationFormula:
          'panelWidth / 1000 * panelHeight / 1000 * item.quantity',
        displayNameTemplate:
          'Филёнка: {{ panelHeight }}х{{ panelWidth }} — {{ item.quantity }} шт.',
        costPerUnit: 100,
      })
      .expect(201);
    const operationId = operationResponse.body.id as string;

    const productResponse = await request(app.getHttpServer())
      .post('/api/products')
      .send({
        name: 'Фасад',
        baseCustomerPrice: 1000,
        customerPricingMethod: 'per_item',
        operationIds: [operationId],
      })
      .expect(201);
    const productId = productResponse.body.id as string;
    expect(productResponse.body.operations).toEqual([
      expect.objectContaining({ id: operationId }),
    ]);

    const groupResponse = await request(app.getHttpServer())
      .post('/api/order-groups')
      .send({ orderNumber: 'OP-09-E2E', customer: { name: 'Заказчик' } })
      .expect(201);
    const groupId = groupResponse.body.id as number;

    const orderResponse = await request(app.getHttpServer())
      .post('/api/orders')
      .send({
        name: 'Фасады',
        orderGroupId: groupId,
        characteristics: {
          profile: {
            name: 'Профиль 68',
            characteristics: { width: 68, grooveDepth: 8 },
          },
        },
        items: [
          {
            templateId: productId,
            quantity: 1,
            characteristics: { width: 540, height: 900 },
          },
        ],
      })
      .expect(201);
    const orderId = orderResponse.body.id as string;
    const itemId = orderResponse.body.items[0].id as string;
    const initialResult =
      orderResponse.body.items[0].productionOperationResults[0];
    expect(initialResult).toEqual(
      expect.objectContaining({
        operationId,
        renderedName: 'Филёнка: 780х420 — 1 шт.',
        totalCost: 32.76,
      }),
    );
    expect(initialResult.calculatedQuantity).toBeCloseTo(0.3276);

    await request(app.getHttpServer())
      .patch(`/api/production-operations/${operationId}`)
      .send({ costPerUnit: 200 })
      .expect(200);

    const savedSnapshot = await request(app.getHttpServer())
      .get(`/api/orders/${orderId}/with-items`)
      .expect(200);
    expect(
      savedSnapshot.body.items[0].productionOperationResults[0].totalCost,
    ).toBe(32.76);

    const draftUpdate = await request(app.getHttpServer())
      .patch(`/api/orders/${orderId}/items/${itemId}`)
      .send({ quantity: 2 })
      .expect(200);
    expect(
      draftUpdate.body.items[0].productionOperationResults[0].totalCost,
    ).toBe(131.04);

    await request(app.getHttpServer())
      .patch(`/api/order-groups/${groupId}`)
      .send({ status: 'in_production' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/api/production-operations/${operationId}`)
      .send({ costPerUnit: 300 })
      .expect(200);

    const productionUpdate = await request(app.getHttpServer())
      .patch(`/api/orders/${orderId}/items/${itemId}`)
      .send({ quantity: 3 })
      .expect(200);
    expect(
      productionUpdate.body.items[0].productionOperationResults[0].totalCost,
    ).toBe(131.04);

    await request(app.getHttpServer())
      .post(`/api/order-groups/${groupId}/recalculate-production`)
      .expect(201)
      .expect({ updatedItems: 1, errors: [] });

    const recalculated = await request(app.getHttpServer())
      .get(`/api/orders/${orderId}/with-items`)
      .expect(200);
    const recalculatedResult =
      recalculated.body.items[0].productionOperationResults[0];
    expect(recalculatedResult).toEqual(
      expect.objectContaining({
        renderedName: 'Филёнка: 780х420 — 3 шт.',
        totalCost: 294.84,
      }),
    );
    expect(recalculatedResult.calculatedQuantity).toBeCloseTo(0.9828);

    expect(dataSource.isInitialized).toBe(true);
  });
});
