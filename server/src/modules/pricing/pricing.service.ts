import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConditionOperator,
  ConditionSource,
  ModifierType,
  PriceModifier,
} from '../price-modifiers/entities/price-modifier.entity';
import { Repository } from 'typeorm';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import {
  CustomerPricingMethod,
  ProductTemplate,
} from '../products/entities/product-template.entity';
import { CalculationMethod } from '../production-operations/entities/production-operation.entity';
import { get } from 'src/shared/utils/object-helpers';
import { PriceModifierCondition } from '../price-modifiers/types/price-modifier-condition.type';

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(PriceModifier)
    private readonly modifiersRepository: Repository<PriceModifier>,
  ) {}

  async calculateCustomerPrice(item: OrderItem, order: Order): Promise<number> {
    const totalBasePrice = this.calculateTotalBasePrice(item);

    const modifiers = await this.modifiersRepository.find({
      relations: {
        productTemplates: true,
      },
    });

    let finalPrice = totalBasePrice;

    for (const modifier of modifiers) {
      const isScopedToProducts =
        modifier.productTemplates && modifier.productTemplates.length > 0;

      if (isScopedToProducts) {
        const isApplicableToCurrentProduct = modifier.productTemplates.some(
          (template) => template.id === item.template.id,
        );

        if (!isApplicableToCurrentProduct) {
          continue;
        }
      }

      if (this.checkConditions(modifier.conditions, item, order)) {
        const modifierValue = Number(modifier.value);
        switch (modifier.type) {
          case ModifierType.PERCENTAGE:
            finalPrice += finalPrice * (modifier.value / 100);
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

  calculateProductionCost(item: OrderItem, template: ProductTemplate): number {
    let totalCost = 0;
    if (!template.operations) return 0;

    for (const operation of template.operations) {
      let cost = 0;
      const width = Number(get(item, 'characteristics.width', 0)) / 1000;
      const height = Number(get(item, 'characteristics.height', 0)) / 1000;
      switch (operation.calculationMethod) {
        case CalculationMethod.PER_ITEM:
          cost = operation.costPerUnit;
          break;

        case CalculationMethod.AREA:
          cost = operation.costPerUnit * width * height;
          break;

        case CalculationMethod.VOLUME: {
          const thickness =
            Number(get(item, 'characteristics.thickness', 0)) / 1000;
          cost = operation.costPerUnit * width * height * thickness;
          break;
        }
      }

      totalCost += cost;
    }

    return totalCost;
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const actualValue = get(
      source === ConditionSource.ORDER ? order : item,
      path as any,
    );

    if (actualValue === undefined || actualValue === null) {
      return false;
    }

    const isComparableNumber =
      typeof actualValue === 'number' && typeof value === 'number';
    const isComparableString =
      typeof actualValue === 'string' && typeof value === 'string';

    if (
      operator !== ConditionOperator.EQ &&
      !isComparableNumber &&
      !isComparableString
    ) {
      return false;
    }

    switch (operator) {
      case ConditionOperator.EQ:
        // Используем `==` для нестрогого сравнения, так как данные из JSON
        // Это осознанный выбор для большей гибкости.
        return actualValue == value;

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
