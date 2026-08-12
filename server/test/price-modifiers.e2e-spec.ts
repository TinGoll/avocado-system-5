import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import request from 'supertest';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { createAppValidationPipe } from '../src/common/pipes/app-validation.pipe';
import { CreatePriceModifierDto } from '../src/modules/price-modifiers/dto/create-price-modifier.dto';
import { UpdatePriceModifierDto } from '../src/modules/price-modifiers/dto/update-price-modifier.dto';
import {
  ConditionOperator,
  ConditionSource,
} from '../src/modules/price-modifiers/entities/price-modifier.entity';
import { PriceModifiersController } from '../src/modules/price-modifiers/price-modifiers.controller';
import { PriceModifiersService } from '../src/modules/price-modifiers/price-modifiers.service';
import type { PriceModifierCondition } from '../src/modules/price-modifiers/types/price-modifier-condition.type';

const leafCondition: PriceModifierCondition = {
  source: ConditionSource.ITEM,
  path: 'quantity',
  operator: ConditionOperator.GTE,
  value: 2,
};

const validGroup: PriceModifierCondition = {
  AND: [
    leafCondition,
    {
      OR: [
        {
          source: ConditionSource.ORDER_GROUP,
          path: 'status',
          operator: ConditionOperator.EQ,
          value: 'draft',
        },
      ],
    },
  ],
};

const createPayload = (conditions: unknown = validGroup) => ({
  name: 'Large order discount',
  type: 'percentage',
  value: '12.5',
  priority: '10',
  conditions,
});

describe('Price modifiers validation (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  const create = jest.fn((dto: CreatePriceModifierDto) => ({
    id: 'created-modifier',
    ...dto,
  }));
  const update = jest.fn((id: string, dto: UpdatePriceModifierDto) => ({
    id,
    ...dto,
  }));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PriceModifiersController],
      providers: [
        {
          provide: PriceModifiersService,
          useValue: { create, update },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(createAppValidationPipe());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    httpServer = app.getHttpServer() as Server;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a valid condition tree on POST and transforms DTO values', async () => {
    const response = await request(httpServer)
      .post('/api/price-modifiers')
      .send(createPayload())
      .expect(201);

    const body = response.body as Record<string, unknown>;
    expect(body.value).toBe(12.5);
    expect(body.priority).toBe(10);
    expect(body.conditions).toEqual(validGroup);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        value: 12.5,
        priority: 10,
        conditions: validGroup,
      }),
    );
  });

  it('accepts a valid partial modifier on PATCH', async () => {
    const conditions: PriceModifierCondition = {
      OR: [leafCondition],
    };

    await request(httpServer)
      .patch('/api/price-modifiers/existing-modifier')
      .send({ value: '7.25', priority: '20', conditions })
      .expect(200);

    expect(update).toHaveBeenCalledWith(
      'existing-modifier',
      expect.objectContaining({ value: 7.25, priority: 20, conditions }),
    );
  });

  it('publishes the same allowlist used by validation', async () => {
    const response = await request(httpServer)
      .get('/api/price-modifiers/condition-paths')
      .expect(200);
    const schemas = response.body as Record<string, Record<string, unknown>>;

    expect(schemas.order.totalPrice).toBeUndefined();
    expect(schemas.item.calculatedCustomerPrice).toBeUndefined();
    expect(schemas.item.calculatedProductionCost).toBeUndefined();
    expect(schemas.item.quantity).toEqual({
      label: 'Количество',
      type: 'number',
    });
  });

  it('rejects unknown top-level DTO fields', () =>
    request(httpServer)
      .post('/api/price-modifiers')
      .send({ ...createPayload(), unexpected: true })
      .expect(400));

  it.each([
    ['an unknown source', { ...leafCondition, source: 'customer' }],
    ['an unknown operator', { ...leafCondition, operator: 'contains' }],
    ['an empty path', { ...leafCondition, path: '   ' }],
    ['an empty group', { AND: [] }],
    ['both AND and OR', { AND: [leafCondition], OR: [leafCondition] }],
  ])('rejects a tree with %s', (_caseName, conditions) =>
    request(httpServer)
      .post('/api/price-modifiers')
      .send(createPayload(conditions))
      .expect(400),
  );

  it.each([
    ['a numeric field with a string value', { ...leafCondition, value: '2' }],
    [
      'a string field with a number value',
      {
        ...leafCondition,
        source: ConditionSource.ORDER,
        path: 'characteristics.material.name',
        operator: ConditionOperator.EQ,
        value: 2,
      },
    ],
    [
      'an enum field with an unknown option',
      {
        ...leafCondition,
        source: ConditionSource.ORDER_GROUP,
        path: 'status',
        operator: ConditionOperator.EQ,
        value: 'unknown',
      },
    ],
    [
      'a string field with an ordering operator',
      {
        ...leafCondition,
        source: ConditionSource.ORDER,
        path: 'characteristics.material.name',
        operator: ConditionOperator.GT,
        value: 'oak',
      },
    ],
  ])('rejects %s', (_caseName, conditions) =>
    request(httpServer)
      .post('/api/price-modifiers')
      .send(createPayload(conditions))
      .expect(400),
  );

  it.each([
    [ConditionSource.ORDER, 'totalPrice'],
    [ConditionSource.ITEM, 'calculatedCustomerPrice'],
    [ConditionSource.ITEM, 'calculatedProductionCost'],
    [ConditionSource.ORDER_GROUP, 'orderCount'],
    [ConditionSource.ITEM, 'quantity.value'],
    [ConditionSource.ORDER, 'characteristics.material'],
  ])('rejects cyclic condition path %s.%s', (source, path) =>
    request(httpServer)
      .post('/api/price-modifiers')
      .send(createPayload({ ...leafCondition, source, path }))
      .expect(400),
  );

  it.each([
    [
      ConditionSource.ORDER,
      'characteristics.material.name',
      ConditionOperator.EQ,
      'oak',
    ],
    [ConditionSource.ITEM, 'quantity', ConditionOperator.GTE, 2],
  ])('keeps accepting ordinary path %s.%s', (source, path, operator, value) =>
    request(httpServer)
      .post('/api/price-modifiers')
      .send(createPayload({ ...leafCondition, source, path, operator, value }))
      .expect(201),
  );

  it('rejects a condition tree deeper than the configured maximum', () => {
    let conditions: unknown = leafCondition;

    for (let depth = 0; depth < 10; depth += 1) {
      conditions = { AND: [conditions] };
    }

    return request(httpServer)
      .post('/api/price-modifiers')
      .send(createPayload(conditions))
      .expect(400);
  });

  it('returns 400 instead of 500 for a corrupted condition tree', () =>
    request(httpServer)
      .patch('/api/price-modifiers/existing-modifier')
      .send({ conditions: { AND: [null] } })
      .expect(400));
});
