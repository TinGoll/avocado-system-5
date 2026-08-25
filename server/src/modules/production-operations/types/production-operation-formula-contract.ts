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
    width?: number;
    grooveDepth?: number;
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

export const PRODUCTION_OPERATION_FORMULA_VARIABLES = [
  'item.width',
  'item.height',
  'item.thickness',
  'item.quantity',
  'profile.width',
  'profile.grooveDepth',
  'panelWidth',
  'panelHeight',
] as const;

export type ProductionOperationFormulaVariable =
  (typeof PRODUCTION_OPERATION_FORMULA_VARIABLES)[number];

export const PRODUCTION_OPERATION_TEMPLATE_VARIABLES =
  [...PRODUCTION_OPERATION_FORMULA_VARIABLES, 'item.name'] as const;

export type ProductionOperationTemplateVariable =
  (typeof PRODUCTION_OPERATION_TEMPLATE_VARIABLES)[number];

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
