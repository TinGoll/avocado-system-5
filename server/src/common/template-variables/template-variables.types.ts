export const TEMPLATE_VARIABLE_SCOPE = {
  PRODUCT_OUTPUT: 'product-output',
  PRODUCTION_OPERATION_FORMULA: 'production-operation-formula',
  PRODUCTION_OPERATION_NAME: 'production-operation-name',
} as const;

export type TemplateVariableScope =
  (typeof TEMPLATE_VARIABLE_SCOPE)[keyof typeof TEMPLATE_VARIABLE_SCOPE];

export type TemplateVariableValueType = 'string' | 'number' | 'boolean';

export interface TemplateVariableDefinition {
  path: string;
  label: string;
  description: string;
  valueType: TemplateVariableValueType;
  unit?: string;
  scopes: readonly TemplateVariableScope[];
  optional?: boolean;
}

export interface RenderTemplateOptions {
  scope: TemplateVariableScope;
  template: string;
  values: unknown;
}

export interface RenderTemplateResult {
  value: string;
  usedVariables: string[];
}

export interface ValidateTemplateResult {
  usedVariables: string[];
}

export type TemplateRendererErrorCode =
  | 'INVALID_SYNTAX'
  | 'UNKNOWN_VARIABLE'
  | 'MISSING_VALUE';

export class TemplateRendererError extends Error {
  constructor(
    public readonly code: TemplateRendererErrorCode,
    message: string,
    public readonly variable?: string,
  ) {
    super(message);
    this.name = 'TemplateRendererError';
  }
}

export class TemplateVariableRegistryError extends Error {
  readonly code = 'UNKNOWN_SCOPE';

  constructor(public readonly scope: string) {
    super(`Unknown template variable scope: ${scope}.`);
    this.name = 'TemplateVariableRegistryError';
  }
}
