import { IsEnum } from 'class-validator';
import { TEMPLATE_VARIABLE_SCOPE } from '../template-variables.types';
import type { TemplateVariableScope } from '../template-variables.types';

export class GetTemplateVariablesDto {
  @IsEnum(TEMPLATE_VARIABLE_SCOPE)
  scope: TemplateVariableScope;
}
