import { Controller, Get, Query } from '@nestjs/common';
import { GetTemplateVariablesDto } from './dto/get-template-variables.dto';
import { TemplateVariableRegistry } from './template-variable-registry';

@Controller('template-variables')
export class TemplateVariablesController {
  constructor(private readonly registry: TemplateVariableRegistry) {}

  @Get()
  getVariables(@Query() query: GetTemplateVariablesDto) {
    return {
      variables: this.registry
        .getByScope(query.scope)
        .map(({ path, label, description, valueType, unit, optional }) => ({
          path,
          label,
          description,
          valueType,
          ...(unit === undefined ? {} : { unit }),
          ...(optional === undefined ? {} : { optional }),
        })),
    };
  }
}
