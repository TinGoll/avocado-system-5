import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConditionOperator,
  ConditionSource,
  ModifierType,
  PriceModifier,
} from '../price-modifiers/entities/price-modifier.entity';
import { Repository } from 'typeorm';
import {
  OrderItem,
  OrderItemProductionOperationResult,
} from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import {
  CustomerPricingMethod,
  ProductTemplate,
} from '../products/entities/product-template.entity';
import { get } from 'src/shared/utils/object-helpers';
import { PriceModifierCondition } from '../price-modifiers/types/price-modifier-condition.type';
import {
  getPriceModifierConditionPathField,
  isConditionOperatorAllowedForField,
  isConditionValueValidForField,
} from '../price-modifiers/condition-paths/price-modifier-condition-paths';
import { ProductionOperationCalculatorService } from '../production-operations/production-operation-calculator.service';
import { ProductDisplayTemplateService } from '../products/product-display-template.service';
import { TemplateRendererService } from '../../common/template-variables/template-renderer.service';
import { TEMPLATE_VARIABLE_SCOPE } from '../../common/template-variables/template-variables.types';

export interface ProductionCostCalculation {
  results: OrderItemProductionOperationResult[];
  totalCost: number;
}

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(PriceModifier)
    private readonly modifiersRepository: Repository<PriceModifier>,
    private readonly operationCalculator: ProductionOperationCalculatorService,
    private readonly productDisplayTemplate: ProductDisplayTemplateService,
    private readonly templateRenderer: TemplateRendererService,
  ) {}

  async calculateCustomerPrice(item: OrderItem, order: Order): Promise<number> {
    const [price] = await this.calculateCustomerPrices([item], order);
    return price;
  }

  async calculateCustomerPrices(
    items: readonly OrderItem[],
    order: Order,
  ): Promise<number[]> {
    if (items.length === 0) {
      return [];
    }

    const modifiers = await this.modifiersRepository.find({
      relations: {
        productTemplates: true,
      },
      order: {
        priority: 'ASC',
        id: 'ASC',
      },
    });

    return items.map((item) =>
      this.calculateCustomerPriceWithModifiers(item, order, modifiers),
    );
  }

  private calculateCustomerPriceWithModifiers(
    item: OrderItem,
    order: Order,
    modifiers: readonly PriceModifier[],
  ): number {
    const totalBasePrice = this.calculateTotalBasePrice(item);
    let finalPrice = totalBasePrice;

    for (const modifier of modifiers) {
      const isScopedToProducts =
        modifier.productTemplates && modifier.productTemplates.length > 0;

      if (isScopedToProducts) {
        const isApplicableToCurrentProduct = modifier.productTemplates.some(
          (template) => template.id === item.template?.id,
        );

        if (!isApplicableToCurrentProduct) {
          continue;
        }
      }

      if (this.checkConditions(modifier.conditions, item, order)) {
        const modifierValue = Number(modifier.value);

        // Business rule: modifiers are applied sequentially by ascending
        // priority, then UUID. A percentage changes the current price, while
        // a fixed amount changes it directly. Negative values are discounts.
        switch (modifier.type) {
          case ModifierType.PERCENTAGE:
            finalPrice += finalPrice * (modifierValue / 100);
            break;
          case ModifierType.FIXED_AMOUNT:
            finalPrice += modifierValue;
            break;
        }
      }
    }

    return finalPrice;
  }

  private calculateTotalBasePrice(item: OrderItem): number {
    const pricingMethod = get(
      item,
      'snapshot.customerPricingMethod',
      CustomerPricingMethod.PER_ITEM,
    );
    const pricePerUnit = Number(get(item, 'snapshot.baseCustomerPrice', 0));
    const quantity = item.quantity;

    if (pricePerUnit === 0 || quantity === 0) {
      return 0;
    }

    switch (pricingMethod) {
      case CustomerPricingMethod.LINEAR_METER: {
        const length = Number(get(item, 'characteristics.height', 0)) / 1000;
        return pricePerUnit * length * quantity;
      }

      case CustomerPricingMethod.AREA: {
        const width = Number(get(item, 'characteristics.width', 0)) / 1000;
        const height = Number(get(item, 'characteristics.height', 0)) / 1000;
        return pricePerUnit * (width * height) * quantity;
      }

      case CustomerPricingMethod.VOLUME: {
        const w = Number(get(item, 'characteristics.width', 0)) / 1000;
        const h = Number(get(item, 'characteristics.height', 0)) / 1000;
        const t = Number(get(item, 'characteristics.thickness', 0)) / 1000;
        return pricePerUnit * (w * h * t) * quantity;
      }

      case CustomerPricingMethod.PER_ITEM:
      default:
        return pricePerUnit * quantity;
    }
  }

  calculateProductionCost(
    item: OrderItem,
    template: ProductTemplate,
    orderCharacteristics: unknown,
  ): ProductionCostCalculation {
    const itemContext = {
      name: item.snapshot?.name ?? template.name,
      width: this.readOptionalNumber(item.characteristics?.width),
      height: this.readOptionalNumber(item.characteristics?.height),
      thickness: this.readOptionalNumber(item.characteristics?.thickness),
      quantity: item.quantity,
    };
    const context = this.operationCalculator.contextFromSnapshot(
      itemContext,
      orderCharacteristics,
    );
    const needsProductDisplay = (template.operations ?? []).some((operation) =>
      this.templateRenderer
        .validate({
          scope: TEMPLATE_VARIABLE_SCOPE.PRODUCTION_OPERATION_NAME,
          template: operation.displayNameTemplate,
        })
        .usedVariables.includes('product.display'),
    );
    if (needsProductDisplay) {
      if (!template.displayTemplate?.trim()) {
        throw new BadRequestException({
          code: 'MISSING_VALUE',
          field: 'displayTemplate',
          message: 'Отсутствует значение: product.display.',
          variable: 'product.display',
        });
      }
      context.product = {
        display: this.productDisplayTemplate.render(
          template.displayTemplate,
          itemContext,
          orderCharacteristics,
        ),
      };
    }
    const results = (template.operations ?? []).map((operation) => {
      const calculation = this.operationCalculator.calculate(
        operation.calculationFormula,
        operation.displayNameTemplate,
        context,
      );
      const totalCost = this.roundMoney(
        Number(operation.costPerUnit) * calculation.calculatedQuantity,
      );

      return {
        operationId: operation.id,
        originalName: operation.name,
        calculationFormula: operation.calculationFormula,
        displayNameTemplate: operation.displayNameTemplate,
        calculationMethod: operation.calculationMethod,
        costPerUnit: Number(operation.costPerUnit),
        calculatedQuantity: calculation.calculatedQuantity,
        calculatedWidth: calculation.calculatedWidth,
        calculatedHeight: calculation.calculatedHeight,
        calculatedThickness: calculation.calculatedThickness,
        renderedName: calculation.renderedName,
        totalCost,
      };
    });

    return {
      results,
      totalCost: this.roundMoney(
        results.reduce((sum, result) => sum + result.totalCost, 0),
      ),
    };
  }

  private readOptionalNumber(value: unknown): number | undefined {
    const number = Number(value);
    return value === undefined || value === null || value === ''
      ? undefined
      : number;
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private checkConditions(
    conditions: PriceModifierCondition,
    item: OrderItem,
    order: Order,
  ): boolean {
    return this.evaluateConditionTree(conditions, item, order);
  }

  /**
   * Рекурсивно обходит дерево условий и вычисляет итоговый результат.
   */
  private evaluateConditionTree(
    condition: PriceModifierCondition,
    item: OrderItem,
    order: Order,
  ): boolean {
    // Проверяем, является ли узел группой "AND"
    if ('AND' in condition && Array.isArray(condition.AND)) {
      // Для "AND" ВСЕ вложенные условия должны быть истинными.
      // Используем Array.prototype.every()
      return condition.AND.every((subCondition) =>
        this.evaluateConditionTree(subCondition, item, order),
      );
    }

    // Проверяем, является ли узел группой "OR"
    if ('OR' in condition && Array.isArray(condition.OR)) {
      // Для "OR" ХОТЯ БЫ ОДНО вложенное условие должно быть истинным.
      // Используем Array.prototype.some()
      return condition.OR.some((subCondition) =>
        this.evaluateConditionTree(subCondition, item, order),
      );
    }

    // Если это не "AND" и не "OR", значит, это "лист" - простое условие.
    // Вызываем обработчик для "листьев".
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.evaluateLeafCondition(condition as any, item, order);
  }

  private evaluateLeafCondition(
    leaf: {
      source: ConditionSource;
      path: string;
      operator: ConditionOperator;
      value: unknown;
    },
    item: OrderItem,
    order: Order,
  ): boolean {
    const { source, path, operator, value } = leaf;

    const field = getPriceModifierConditionPathField(source, path);
    if (
      !field ||
      !isConditionOperatorAllowedForField(field, operator) ||
      !isConditionValueValidForField(field, value)
    ) {
      return false;
    }

    let dataSource: any;

    switch (source) {
      case ConditionSource.ORDER:
        dataSource = order;
        break;
      case ConditionSource.ITEM:
        dataSource = item;
        break;
      case ConditionSource.ORDER_GROUP:
        if (!order.orderGroup) {
          return false;
        }
        dataSource = order.orderGroup;
        break;
      default:
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const actualValue = get(dataSource, path as any);

    if (actualValue === undefined || actualValue === null) {
      return false;
    }

    if (
      (field.type === 'number' && typeof actualValue !== 'number') ||
      (field.type !== 'number' && typeof actualValue !== 'string')
    ) {
      return false;
    }

    switch (operator) {
      case ConditionOperator.EQ:
        if (typeof actualValue === 'string' && typeof value === 'string') {
          return actualValue.toLowerCase() === value.toLowerCase();
        }
        return actualValue === value;

      case ConditionOperator.GT:
        return actualValue > (value as number | string);
      case ConditionOperator.LT:
        return actualValue < (value as number | string);
      case ConditionOperator.GTE:
        return actualValue >= (value as number | string);
      case ConditionOperator.LTE:
        return actualValue <= (value as number | string);

      default: {
        return false;
      }
    }
  }
}
