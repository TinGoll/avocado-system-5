import { TemplateVariablePathForScope } from '../../../common/template-variables/template-variable-registry';
import { TEMPLATE_VARIABLE_SCOPE } from '../../../common/template-variables/template-variables.types';

/**
 * Public limits shared by persistence validation, the formula evaluator and UI.
 */
export const PRODUCTION_OPERATION_FORMULA_MAX_LENGTH = 1000;
export const PRODUCTION_OPERATION_TEMPLATE_MAX_LENGTH = 500;

/**
 * Raw values available while evaluating a production operation.
 * Geometry is expressed in millimetres; quantity is expressed in items.
 * Optional values cause an error only when the expression or template uses them.
 */
export interface ProductionOperationFormulaContext {
  item: {
    name?: string;
    width?: number;
    height?: number;
    thickness?: number;
    quantity: number;
  };
  profile?: {
    name?: string;
    width?: number;
    grooveDepth?: number;
  };
  panel?: {
    name?: string;
  };
}

/**
 * Optional server-derived inner geometry for operations that use a profile
 * (for example, panel production). Operations are not bound to a panel entity.
 * Both values are rounded to whole millimetres before they are exposed to a
 * formula or a display-name template.
 */
export interface ProductionOperationDerivedContext {
  panelWidth?: number;
  panelHeight?: number;
}

export type ProductionOperationEvaluationContext =
  ProductionOperationFormulaContext & ProductionOperationDerivedContext;

export type ProductionOperationFormulaVariable = TemplateVariablePathForScope<
  typeof TEMPLATE_VARIABLE_SCOPE.PRODUCTION_OPERATION_FORMULA
>;

export type ProductionOperationTemplateVariable = TemplateVariablePathForScope<
  typeof TEMPLATE_VARIABLE_SCOPE.PRODUCTION_OPERATION_NAME
>;

export const PRODUCTION_OPERATION_CALCULATION_ERROR_CODES = [
  'FORMULA_TOO_LONG',
  'TEMPLATE_TOO_LONG',
  'INVALID_SYNTAX',
  'UNKNOWN_VARIABLE',
  'MISSING_VALUE',
  'DIVISION_BY_ZERO',
  'NOT_FINITE',
  'NEGATIVE_RESULT',
] as const;

export type ProductionOperationCalculationErrorCode =
  (typeof PRODUCTION_OPERATION_CALCULATION_ERROR_CODES)[number];

export type ProductionOperationCalculationErrorField =
  | 'calculationFormula'
  | 'displayNameTemplate'
  | 'context';

export interface ProductionOperationCalculationError {
  code: ProductionOperationCalculationErrorCode;
  field: ProductionOperationCalculationErrorField;
  message: string;
  variable?: string;
}
