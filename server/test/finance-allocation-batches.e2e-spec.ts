import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { createAppValidationPipe } from '../src/common/pipes/app-validation.pipe';
import { CustomerFinanceService } from '../src/modules/finance/customer-finance.service';
import { FinanceAllocationBatchesService } from '../src/modules/finance/finance-allocation-batches.service';
import { FinanceReportsController } from '../src/modules/finance/finance.controller';
import { FinanceReportsService } from '../src/modules/finance/finance-reports.service';
import { CustomerFinanceHistoryService } from '../src/modules/finance/customer-finance-history.service';

describe('Finance allocation batches API (e2e)', () => {
  let app: INestApplication;
  let httpServer: Server;
  const create = jest.fn((dto: Record<string, unknown>) => ({
    id: 42,
    total: '10.25',
    ...dto,
  }));
  const getResult = jest.fn((id: number) => ({
    id,
    number: `Распределение №${id}`,
    total: '10.25',
  }));
  const getHistory = jest.fn(
    (customerId: string, query: Record<string, unknown>) => ({
      customer: { id: customerId },
      query,
      items: [],
      meta: { limit: query.limit, nextCursor: null },
    }),
  );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [FinanceReportsController],
      providers: [
        { provide: FinanceReportsService, useValue: {} },
        { provide: CustomerFinanceService, useValue: {} },
        {
          provide: CustomerFinanceHistoryService,
          useValue: { getHistory },
        },
        {
          provide: FinanceAllocationBatchesService,
          useValue: { create, getResult },
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

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => jest.clearAllMocks());

  it('creates a batch with transformed and validated input', async () => {
    const payload = {
      customerId: 'd9428888-122b-4a0b-9a0a-e8a1bb2e7738',
      requestId: '0c9a5f7d-3e16-4d9d-9309-3ea29d8348c7',
      expectedRevision: 'a'.repeat(64),
      comment: 'Комментарий',
      allocations: [{ orderGroupId: '12', amount: '10.25' }],
    };

    await request(httpServer)
      .post('/api/finance/allocation-batches')
      .send(payload)
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({ id: 42, total: '10.25' });
      });
    expect(create).toHaveBeenCalledWith({
      ...payload,
      allocations: [{ orderGroupId: 12, amount: '10.25' }],
    });
  });

  it('gets a permanent batch result URL', async () => {
    await request(httpServer)
      .get('/api/finance/allocation-batches/42')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual({
          id: 42,
          number: 'Распределение №42',
          total: '10.25',
        });
      });
    expect(getResult).toHaveBeenCalledWith(42);
  });

  it('rejects invalid money, revision and more than 100 lines', async () => {
    const base = {
      customerId: 'd9428888-122b-4a0b-9a0a-e8a1bb2e7738',
      requestId: '0c9a5f7d-3e16-4d9d-9309-3ea29d8348c7',
      expectedRevision: 'invalid',
      allocations: Array.from({ length: 101 }, () => ({
        orderGroupId: 1,
        amount: '1.001',
      })),
    };

    await request(httpServer)
      .post('/api/finance/allocation-batches')
      .send(base)
      .expect(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('validates and transforms customer history filters', async () => {
    const customerId = 'd9428888-122b-4a0b-9a0a-e8a1bb2e7738';
    await request(httpServer)
      .get(
        `/api/finance/customers/${customerId}/history?types=payment,allocation&limit=20`,
      )
      .expect(200);

    expect(getHistory).toHaveBeenCalledWith(customerId, {
      types: ['payment', 'allocation'],
      limit: 20,
    });
  });
});
