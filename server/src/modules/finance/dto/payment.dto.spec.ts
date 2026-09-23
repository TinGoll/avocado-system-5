import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { FinancialPaymentMethod } from '../entities/financial-payment.entity';
import { CancelPaymentDto, CreatePaymentDto } from './payment.dto';

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
});
