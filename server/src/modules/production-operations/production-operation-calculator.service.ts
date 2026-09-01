import { BadRequestException, Injectable } from '@nestjs/common';
import { TemplateVariableRegistry } from '../../common/template-variables/template-variable-registry';
import { TemplateRendererService } from '../../common/template-variables/template-renderer.service';
import {
  TEMPLATE_VARIABLE_SCOPE,
  TemplateRendererError,
} from '../../common/template-variables/template-variables.types';
import {
  PRODUCTION_OPERATION_FORMULA_MAX_LENGTH,
  PRODUCTION_OPERATION_TEMPLATE_MAX_LENGTH,
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
  calculatedWidth?: number;
  calculatedHeight?: number;
  calculatedThickness?: number | null;
  panelWidth?: number;
  panelHeight?: number;
}

@Injectable()
export class ProductionOperationCalculatorService {
  constructor(
    private readonly templateRenderer: TemplateRendererService,
    private readonly templateVariableRegistry: TemplateVariableRegistry,
  ) {}

  validate(calculationFormula: string, displayNameTemplate: string): void {
    this.parseFormula(calculationFormula);
    this.validateNameTemplate(displayNameTemplate);
  }

  calculate(
    calculationFormula: string,
    displayNameTemplate: string,
    context: ProductionOperationFormulaContext,
  ): ProductionOperationCalculationResult {
    const evaluationContext = this.deriveContext(context);
    const expression = this.parseFormula(calculationFormula);
    const formulaVariables = this.collectVariables(expression);
    const usesPanelGeometry =
      formulaVariables.has('panelWidth') || formulaVariables.has('panelHeight');
    this.validateNameTemplate(displayNameTemplate);
    const calculatedQuantity = this.evaluate(expression, evaluationContext);

    if (calculatedQuantity < 0) {
      this.fail(
        'NEGATIVE_RESULT',
        'calculationFormula',
        'Результат формулы не может быть отрицательным.',
      );
    }

    const renderedName = this.renderName(
      displayNameTemplate,
      evaluationContext,
    );

    return {
      calculatedQuantity,
      renderedName: renderedName.value,
      calculatedWidth: formulaVariables.has('panelWidth')
        ? evaluationContext.panelWidth
        : evaluationContext.item.width,
      calculatedHeight: formulaVariables.has('panelHeight')
        ? evaluationContext.panelHeight
        : evaluationContext.item.height,
      calculatedThickness:
        usesPanelGeometry && !formulaVariables.has('item.thickness')
          ? null
          : evaluationContext.item.thickness,
      panelWidth: evaluationContext.panelWidth,
      panelHeight: evaluationContext.panelHeight,
    };
  }

  contextFromSnapshot(
    item: ProductionOperationFormulaContext['item'],
    orderCharacteristics: unknown,
  ): ProductionOperationFormulaContext {
    const profile = this.readProfile(orderCharacteristics);
    const panel = this.readPanel(orderCharacteristics);
    return {
      item,
      ...(profile ? { profile } : {}),
      ...(panel ? { panel } : {}),
    };
  }

  private deriveContext(
    context: ProductionOperationFormulaContext,
  ): ProductionOperationEvaluationContext {
    const result: ProductionOperationEvaluationContext = {
      item: { ...context.item },
      ...(context.profile ? { profile: { ...context.profile } } : {}),
      ...(context.panel ? { panel: { ...context.panel } } : {}),
      ...(context.product ? { product: { ...context.product } } : {}),
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
      ...(typeof profile.name === 'string' ? { name: profile.name } : {}),
      ...(typeof characteristics.width === 'number'
        ? { width: characteristics.width }
        : {}),
      ...(typeof characteristics.grooveDepth === 'number'
        ? { grooveDepth: characteristics.grooveDepth }
        : {}),
    };
  }

  private readPanel(
    orderCharacteristics: unknown,
  ): ProductionOperationFormulaContext['panel'] | undefined {
    if (!this.isRecord(orderCharacteristics)) return undefined;
    const panel = orderCharacteristics.panel;
    if (!this.isRecord(panel)) return undefined;
    return typeof panel.name === 'string' ? { name: panel.name } : undefined;
  }

  private parseFormula(formula: string): ExpressionNode {
    if (formula.length > PRODUCTION_OPERATION_FORMULA_MAX_LENGTH) {
      this.fail(
        'FORMULA_TOO_LONG',
        'calculationFormula',
        'Формула слишком длинная.',
      );
    }
    return new FormulaParser(
      formula,
      this.templateVariableRegistry,
      (code, message, variable) =>
        this.fail(code, 'calculationFormula', message, variable),
    ).parse();
  }

  private renderName(
    template: string,
    context: ProductionOperationEvaluationContext,
  ) {
    if (template.length > PRODUCTION_OPERATION_TEMPLATE_MAX_LENGTH) {
      this.fail(
        'TEMPLATE_TOO_LONG',
        'displayNameTemplate',
        'Шаблон слишком длинный.',
      );
    }

    try {
      return this.templateRenderer.render({
        scope: TEMPLATE_VARIABLE_SCOPE.PRODUCTION_OPERATION_NAME,
        template,
        values: context,
      });
    } catch (error) {
      if (!(error instanceof TemplateRendererError)) throw error;
      const variable = error.variable;
      const isMissingPanelProfile =
        error.code === 'MISSING_VALUE' &&
        (variable === 'panelWidth' || variable === 'panelHeight') &&
        (context.profile?.width === undefined ||
          context.profile.grooveDepth === undefined);
      const isMissingNumber =
        error.code === 'MISSING_VALUE' &&
        variable !== undefined &&
        this.templateVariableRegistry.getDefinition(
          variable,
          TEMPLATE_VARIABLE_SCOPE.PRODUCTION_OPERATION_NAME,
        )?.valueType === 'number';
      this.fail(
        error.code,
        'displayNameTemplate',
        error.code === 'INVALID_SYNTAX'
          ? 'Некорректный шаблон названия.'
          : isMissingPanelProfile
            ? 'Выберите профиль заказа для расчёта размера филёнки.'
            : isMissingNumber
              ? `Отсутствует числовое значение: ${variable}.`
              : error.message,
        variable,
      );
    }
  }

  private validateNameTemplate(template: string): void {
    this.renderName(template, {
      item: { name: '', width: 0, height: 0, thickness: 0, quantity: 0 },
      profile: { name: '', width: 0, grooveDepth: 0 },
      panel: { name: '' },
      product: { display: '' },
      panelWidth: 0,
      panelHeight: 0,
    });
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

  private collectVariables(
    node: ExpressionNode,
  ): Set<ProductionOperationFormulaVariable> {
    if (node.type === 'variable') return new Set([node.name]);
    if (node.type === 'number') return new Set();
    if (node.type === 'unary') return this.collectVariables(node.operand);

    return new Set([
      ...this.collectVariables(node.left),
      ...this.collectVariables(node.right),
    ]);
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
      'profile.name': context.profile?.name,
      'panel.name': context.panel?.name,
      'product.display': context.product?.display,
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
      const isMissingPanelProfile =
        (variable === 'panelWidth' || variable === 'panelHeight') &&
        (context.profile?.width === undefined ||
          context.profile.grooveDepth === undefined);

      this.fail(
        'MISSING_VALUE',
        field,
        isMissingPanelProfile
          ? 'Выберите профиль заказа для расчёта размера филёнки.'
          : variable === 'item.name' ||
              variable === 'profile.name' ||
              variable === 'panel.name'
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
    private readonly registry: TemplateVariableRegistry,
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
      const definition = this.registry.getDefinition(
        identifier,
        TEMPLATE_VARIABLE_SCOPE.PRODUCTION_OPERATION_FORMULA,
      );
      if (!definition || definition.valueType !== 'number') {
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
