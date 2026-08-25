import { BadRequestException, Injectable } from '@nestjs/common';
import {
  PRODUCTION_OPERATION_FORMULA_MAX_LENGTH,
  PRODUCTION_OPERATION_FORMULA_VARIABLES,
  PRODUCTION_OPERATION_TEMPLATE_MAX_LENGTH,
  PRODUCTION_OPERATION_TEMPLATE_VARIABLES,
  ProductionOperationCalculationError,
  ProductionOperationCalculationErrorCode,
  ProductionOperationCalculationErrorField,
  ProductionOperationEvaluationContext,
  ProductionOperationFormulaContext,
  ProductionOperationFormulaVariable,
  ProductionOperationTemplateVariable,
} from './types/production-operation-formula-contract';

type ExpressionNode =
  | { type: 'number'; value: number }
  | { type: 'variable'; name: ProductionOperationFormulaVariable }
  | { type: 'unary'; operator: '+' | '-'; operand: ExpressionNode }
  | {
      type: 'binary';
      operator: '+' | '-' | '*' | '/';
      left: ExpressionNode;
      right: ExpressionNode;
    };

export interface ProductionOperationCalculationResult {
  calculatedQuantity: number;
  renderedName: string;
  panelWidth?: number;
  panelHeight?: number;
}

@Injectable()
export class ProductionOperationCalculatorService {
  validate(calculationFormula: string, displayNameTemplate: string): void {
    this.parseFormula(calculationFormula);
    this.parseTemplate(displayNameTemplate);
  }

  calculate(
    calculationFormula: string,
    displayNameTemplate: string,
    context: ProductionOperationFormulaContext,
  ): ProductionOperationCalculationResult {
    const evaluationContext = this.deriveContext(context);
    const expression = this.parseFormula(calculationFormula);
    const templateVariables = this.parseTemplate(displayNameTemplate);
    const calculatedQuantity = this.evaluate(expression, evaluationContext);

    if (calculatedQuantity < 0) {
      this.fail(
        'NEGATIVE_RESULT',
        'calculationFormula',
        'Результат формулы не может быть отрицательным.',
      );
    }

    const renderedName = displayNameTemplate.replace(
      /{{\s*([^{}]+?)\s*}}/g,
      (_placeholder, rawVariable: string) =>
        String(
          this.getValue(
            rawVariable.trim() as ProductionOperationTemplateVariable,
            evaluationContext,
            'displayNameTemplate',
          ),
        ),
    );

    for (const variable of templateVariables) {
      this.getValue(variable, evaluationContext, 'displayNameTemplate');
    }

    return {
      calculatedQuantity,
      renderedName,
      panelWidth: evaluationContext.panelWidth,
      panelHeight: evaluationContext.panelHeight,
    };
  }

  contextFromSnapshot(
    item: ProductionOperationFormulaContext['item'],
    orderCharacteristics: unknown,
  ): ProductionOperationFormulaContext {
    const profile = this.readProfile(orderCharacteristics);
    return { item, ...(profile ? { profile } : {}) };
  }

  private deriveContext(
    context: ProductionOperationFormulaContext,
  ): ProductionOperationEvaluationContext {
    const result: ProductionOperationEvaluationContext = {
      item: { ...context.item },
      ...(context.profile ? { profile: { ...context.profile } } : {}),
    };
    const { width, height } = context.item;
    const profileWidth = context.profile?.width;
    const grooveDepth = context.profile?.grooveDepth;

    if (profileWidth !== undefined && grooveDepth !== undefined) {
      if (width !== undefined) {
        result.panelWidth = Math.round(
          width - 2 * profileWidth + 2 * grooveDepth,
        );
      }
      if (height !== undefined) {
        result.panelHeight = Math.round(
          height - 2 * profileWidth + 2 * grooveDepth,
        );
      }
    }
    return result;
  }

  private readProfile(
    orderCharacteristics: unknown,
  ): ProductionOperationFormulaContext['profile'] | undefined {
    if (!this.isRecord(orderCharacteristics)) return undefined;
    const profile = orderCharacteristics.profile;
    if (!this.isRecord(profile)) return undefined;
    const characteristics = this.isRecord(profile.characteristics)
      ? profile.characteristics
      : profile;
    return {
      ...(typeof characteristics.width === 'number'
        ? { width: characteristics.width }
        : {}),
      ...(typeof characteristics.grooveDepth === 'number'
        ? { grooveDepth: characteristics.grooveDepth }
        : {}),
    };
  }

  private parseFormula(formula: string): ExpressionNode {
    if (formula.length > PRODUCTION_OPERATION_FORMULA_MAX_LENGTH) {
      this.fail(
        'FORMULA_TOO_LONG',
        'calculationFormula',
        'Формула слишком длинная.',
      );
    }
    return new FormulaParser(formula, (code, message, variable) =>
      this.fail(code, 'calculationFormula', message, variable),
    ).parse();
  }

  private parseTemplate(
    template: string,
  ): ProductionOperationTemplateVariable[] {
    if (template.length > PRODUCTION_OPERATION_TEMPLATE_MAX_LENGTH) {
      this.fail(
        'TEMPLATE_TOO_LONG',
        'displayNameTemplate',
        'Шаблон слишком длинный.',
      );
    }

    const variables: ProductionOperationTemplateVariable[] = [];
    let cursor = 0;
    const placeholder = /{{\s*([^{}]+?)\s*}}/g;
    for (const match of template.matchAll(placeholder)) {
      const start = match.index ?? 0;
      if (
        template.slice(cursor, start).includes('{{') ||
        template.slice(cursor, start).includes('}}')
      ) {
        this.fail(
          'INVALID_SYNTAX',
          'displayNameTemplate',
          'Некорректный шаблон названия.',
        );
      }
      const variable = match[1].trim();
      if (!this.isTemplateVariable(variable)) {
        this.fail(
          'UNKNOWN_VARIABLE',
          'displayNameTemplate',
          `Неизвестная переменная: ${variable}.`,
          variable,
        );
      }
      variables.push(variable);
      cursor = start + match[0].length;
    }
    if (
      template.slice(cursor).includes('{{') ||
      template.slice(cursor).includes('}}')
    ) {
      this.fail(
        'INVALID_SYNTAX',
        'displayNameTemplate',
        'Некорректный шаблон названия.',
      );
    }
    return variables;
  }

  private evaluate(
    node: ExpressionNode,
    context: ProductionOperationEvaluationContext,
  ): number {
    let result: number;
    if (node.type === 'number') result = node.value;
    else if (node.type === 'variable') {
      result = this.getFormulaValue(node.name, context);
    } else if (node.type === 'unary') {
      const value = this.evaluate(node.operand, context);
      result = node.operator === '-' ? -value : value;
    } else {
      const left = this.evaluate(node.left, context);
      const right = this.evaluate(node.right, context);
      if (node.operator === '/' && Object.is(Math.abs(right), 0)) {
        this.fail(
          'DIVISION_BY_ZERO',
          'calculationFormula',
          'Деление на ноль запрещено.',
        );
      }
      result =
        node.operator === '+'
          ? left + right
          : node.operator === '-'
            ? left - right
            : node.operator === '*'
              ? left * right
              : left / right;
    }
    if (!Number.isFinite(result)) {
      this.fail(
        'NOT_FINITE',
        'calculationFormula',
        'Результат вычисления должен быть конечным числом.',
      );
    }
    return result;
  }

  private getValue(
    variable: ProductionOperationTemplateVariable,
    context: ProductionOperationEvaluationContext,
    field: ProductionOperationCalculationErrorField,
  ): number | string {
    const values: Record<
      ProductionOperationTemplateVariable,
      number | string | undefined
    > = {
      'item.name': context.item.name,
      'item.width': context.item.width,
      'item.height': context.item.height,
      'item.thickness': context.item.thickness,
      'item.quantity': context.item.quantity,
      'profile.width': context.profile?.width,
      'profile.grooveDepth': context.profile?.grooveDepth,
      panelWidth: context.panelWidth,
      panelHeight: context.panelHeight,
    };
    const value = values[variable];
    if (
      value === undefined ||
      (typeof value === 'number' && !Number.isFinite(value))
    ) {
      this.fail(
        'MISSING_VALUE',
        field,
        variable === 'item.name'
          ? `Отсутствует значение: ${variable}.`
          : `Отсутствует числовое значение: ${variable}.`,
        variable,
      );
    }
    return value;
  }

  private getFormulaValue(
    variable: ProductionOperationFormulaVariable,
    context: ProductionOperationEvaluationContext,
  ): number {
    return this.getValue(variable, context, 'calculationFormula') as number;
  }

  private isTemplateVariable(
    value: string,
  ): value is ProductionOperationTemplateVariable {
    return (
      PRODUCTION_OPERATION_TEMPLATE_VARIABLES as readonly string[]
    ).includes(value);
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private fail(
    code: ProductionOperationCalculationErrorCode,
    field: ProductionOperationCalculationErrorField,
    message: string,
    variable?: string,
  ): never {
    const error: ProductionOperationCalculationError = {
      code,
      field,
      message,
      ...(variable ? { variable } : {}),
    };
    throw new BadRequestException(error);
  }
}

class FormulaParser {
  private position = 0;

  constructor(
    private readonly input: string,
    private readonly fail: (
      code: ProductionOperationCalculationErrorCode,
      message: string,
      variable?: string,
    ) => never,
  ) {}

  parse(): ExpressionNode {
    const result = this.expression();
    this.skipWhitespace();
    if (this.position !== this.input.length) {
      this.fail(
        'INVALID_SYNTAX',
        `Недопустимый символ в позиции ${this.position + 1}.`,
      );
    }
    return result;
  }

  private expression(): ExpressionNode {
    let node = this.term();
    while (true) {
      const operator = this.takeOperator(['+', '-']);
      if (!operator) return node;
      node = { type: 'binary', operator, left: node, right: this.term() };
    }
  }

  private term(): ExpressionNode {
    let node = this.unary();
    while (true) {
      const operator = this.takeOperator(['*', '/']);
      if (!operator) return node;
      node = { type: 'binary', operator, left: node, right: this.unary() };
    }
  }

  private unary(): ExpressionNode {
    const operator = this.takeOperator(['+', '-']);
    return operator
      ? { type: 'unary', operator, operand: this.unary() }
      : this.primary();
  }

  private primary(): ExpressionNode {
    this.skipWhitespace();
    if (this.input[this.position] === '(') {
      this.position++;
      const node = this.expression();
      this.skipWhitespace();
      if (this.input[this.position++] !== ')') {
        this.fail('INVALID_SYNTAX', 'Ожидалась закрывающая скобка.');
      }
      return node;
    }
    const rest = this.input.slice(this.position);
    const number = /^\d+(?:\.\d+)?/.exec(rest)?.[0];
    if (number) {
      this.position += number.length;
      return { type: 'number', value: Number(number) };
    }
    const identifier = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*/.exec(
      rest,
    )?.[0];
    if (identifier) {
      this.position += identifier.length;
      if (
        !(PRODUCTION_OPERATION_FORMULA_VARIABLES as readonly string[]).includes(
          identifier,
        )
      ) {
        this.fail(
          'UNKNOWN_VARIABLE',
          `Неизвестная переменная: ${identifier}.`,
          identifier,
        );
      }
      return {
        type: 'variable',
        name: identifier as ProductionOperationFormulaVariable,
      };
    }
    this.fail(
      'INVALID_SYNTAX',
      `Ожидалось число, переменная или скобка в позиции ${this.position + 1}.`,
    );
  }

  private takeOperator<T extends '+' | '-' | '*' | '/'>(
    operators: readonly T[],
  ): T | undefined {
    this.skipWhitespace();
    const value = this.input[this.position] as T;
    if (!operators.includes(value)) return undefined;
    this.position++;
    return value;
  }

  private skipWhitespace(): void {
    while (/\s/.test(this.input[this.position] ?? '')) this.position++;
  }
}
