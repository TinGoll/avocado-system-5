import { validate } from 'class-validator';
import { CalculationMethod } from '../entities/production-operation.entity';
import {
  PRODUCTION_OPERATION_FORMULA_MAX_LENGTH,
  PRODUCTION_OPERATION_TEMPLATE_MAX_LENGTH,
} from '../types/production-operation-formula-contract';
import { CreateProductionOperationDto } from './create-production-operation.dto';

const createValidDto = (): CreateProductionOperationDto =>
  Object.assign(new CreateProductionOperationDto(), {
    name: 'Распил',
    calculationMethod: CalculationMethod.PER_ITEM,
    calculationFormula: 'item.quantity',
    displayNameTemplate: 'Распил — {{ item.quantity }} шт.',
    costPerUnit: 100,
  });

describe('CreateProductionOperationDto', () => {
  it('accepts formula and display-name template within their limits', async () => {
    await expect(validate(createValidDto())).resolves.toHaveLength(0);
  });

  it.each([
    ['calculationFormula', PRODUCTION_OPERATION_FORMULA_MAX_LENGTH],
    ['displayNameTemplate', PRODUCTION_OPERATION_TEMPLATE_MAX_LENGTH],
  ] as const)('requires and limits %s', async (field, maxLength) => {
    const missingDto = createValidDto();
    missingDto[field] = '';

    const missingErrors = await validate(missingDto);
    expect(missingErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: field })]),
    );

    const oversizedDto = createValidDto();
    oversizedDto[field] = 'x'.repeat(maxLength + 1);

    const oversizedErrors = await validate(oversizedDto);
    expect(oversizedErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: field })]),
    );
  });
});
