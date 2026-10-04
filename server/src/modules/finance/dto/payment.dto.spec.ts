import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { FinancialPaymentMethod } from '../entities/financial-payment.entity';
import {
  CancelPaymentDto,
  CreatePaymentDto,
  ReplacePaymentAllocationsDto,
} from './payment.dto';

describe('payment DTOs', () => {
  const validCreate = {
    customerId: '11111111-1111-4111-8111-111111111111',
    amount: '10.00',
    paymentDate: '2026-09-23',
    method: FinancialPaymentMethod.CASH,
    externalReference: 'receipt',
    comment: 'advance',
    requestId: '22222222-2222-4222-8222-222222222222',
  };

  it.each(Object.values(FinancialPaymentMethod))(
    'accepts method %s',
    async (method) => {
      expect(
        await validate(
          plainToInstance(CreatePaymentDto, { ...validCreate, method }),
        ),
      ).toHaveLength(0);
    },
  );

  it.each([
    { amount: '0' },
    { amount: '-1.00' },
    { amount: '1.001' },
    { paymentDate: '2026-02-30' },
    { externalReference: 'x'.repeat(501) },
    { comment: 'x'.repeat(1001) },
  ])('rejects invalid create data %#', async (change) => {
    expect(
      await validate(
        plainToInstance(CreatePaymentDto, { ...validCreate, ...change }),
      ),
    ).not.toHaveLength(0);
  });

  it('requires a cancellation date and non-blank reason', async () => {
    const dto = plainToInstance(CancelPaymentDto, {
      cancellationDate: 'not-a-date',
      reason: '   ',
      expectedVersion: -1,
      requestId: validCreate.requestId,
    });
    expect(await validate(dto)).toHaveLength(3);
  });

  it('validates nested allocation rows and replacement metadata', async () => {
    const invalidCreate = plainToInstance(CreatePaymentDto, {
      ...validCreate,
      allocations: [{ accrualId: 'invalid', amount: '0' }],
    });
    expect(await validate(invalidCreate)).not.toHaveLength(0);

    const validReplace = plainToInstance(ReplacePaymentAllocationsDto, {
      allocations: [
        {
          accrualId: '33333333-3333-4333-8333-333333333333',
          amount: '1.25',
        },
      ],
      expectedVersion: 0,
      reason: 'Reallocate',
    });
    expect(await validate(validReplace)).toHaveLength(0);
  });
});
