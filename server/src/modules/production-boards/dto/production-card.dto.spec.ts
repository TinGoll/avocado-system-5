import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CardsQueryDto } from './production-card.dto';

describe('CardsQueryDto', () => {
  it('converts an HTTP limit query parameter to a number', async () => {
    const query = plainToInstance(CardsQueryDto, { limit: '50' });

    expect(query.limit).toBe(50);
    await expect(validate(query)).resolves.toHaveLength(0);
  });

  it('keeps the default limit when the parameter is omitted', async () => {
    const query = plainToInstance(CardsQueryDto, {});

    expect(query.limit).toBe(50);
    await expect(validate(query)).resolves.toHaveLength(0);
  });
});
