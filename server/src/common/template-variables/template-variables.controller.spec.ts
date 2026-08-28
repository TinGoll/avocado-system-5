import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createAppValidationPipe } from '../pipes/app-validation.pipe';
import { GetTemplateVariablesDto } from './dto/get-template-variables.dto';
import { TemplateVariableRegistry } from './template-variable-registry';
import { TemplateVariablesController } from './template-variables.controller';
import { TEMPLATE_VARIABLE_SCOPE } from './template-variables.types';

describe('TemplateVariablesController', () => {
  let controller: TemplateVariablesController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [TemplateVariablesController],
      providers: [TemplateVariableRegistry],
    }).compile();

    controller = moduleRef.get(TemplateVariablesController);
  });

  it.each(Object.values(TEMPLATE_VARIABLE_SCOPE))(
    'returns safe metadata in stable order for %s',
    (scope) => {
      const first = controller.getVariables({ scope });
      const second = controller.getVariables({ scope });

      expect(second).toEqual(first);
      expect(first.variables.length).toBeGreaterThan(0);
      expect(typeof first.variables[0].path).toBe('string');
      expect(typeof first.variables[0].label).toBe('string');
      expect(typeof first.variables[0].description).toBe('string');
      expect(typeof first.variables[0].valueType).toBe('string');
      expect(first.variables[0]).not.toHaveProperty('scopes');
    },
  );

  it('keeps string variables out of the formula scope', () => {
    const result = controller.getVariables({
      scope: TEMPLATE_VARIABLE_SCOPE.PRODUCTION_OPERATION_FORMULA,
    });

    expect(
      result.variables.every(({ valueType }) => valueType === 'number'),
    ).toBe(true);
  });

  it('rejects an unknown scope through the application validation pipe', async () => {
    const pipe = createAppValidationPipe();

    await expect(
      pipe.transform(
        { scope: 'unknown' },
        { type: 'query', metatype: GetTemplateVariablesDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
