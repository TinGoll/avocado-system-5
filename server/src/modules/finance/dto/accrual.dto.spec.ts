import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AdjustAccrualDto,
  CreateManualAccrualDto,
  CreateOrderAccrualDto,
} from './accrual.dto';

describe('accrual DTOs', () => {
  it('accepts the documented order accrual request', async () => {
    const dto = plainToInstance(CreateOrderAccrualDto, {
      orderGroupId: 1,
      effectiveDate: '2026-09-22',
      requestId: '11111111-1111-4111-8111-111111111111',
    });
    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('rejects malformed manual money, date and empty title', async () => {
    const dto = plainToInstance(CreateManualAccrualDto, {
      customerId: '11111111-1111-4111-8111-111111111111',
      title: '',
      amount: '1.234',
      effectiveDate: 'not-a-date',
      requestId: '22222222-2222-4222-8222-222222222222',
    });
    expect(await validate(dto)).toHaveLength(3);
  });

  it('requires adjustment reason, version and a signed money string', async () => {
    const dto = plainToInstance(AdjustAccrualDto, {
      amount: '-10.00',
      effectiveDate: '2026-09-22',
      requestId: '33333333-3333-4333-8333-333333333333',
      expectedVersion: 0,
      reason: 'Correction',
    });
    await expect(validate(dto)).resolves.toEqual([]);
  });
});
