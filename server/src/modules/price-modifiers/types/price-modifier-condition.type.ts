import { Paths } from 'src/shared/utils/object-helpers';
import {
  ConditionOperator,
  ConditionSource,
} from '../entities/price-modifier.entity';
import { Order } from 'src/modules/orders/entities/order.entity';
import { OrderItem } from 'src/modules/orders/entities/order-item.entity';

// "Лист" дерева - это отдельное, конкретное условие.
// Оно может быть связано либо с заказом, либо с элементом заказа.
type LeafCondition =
  | {
      source: ConditionSource.ORDER;
      path: Paths<Order>;
      operator: ConditionOperator;
      value: unknown;
    }
  | {
      source: ConditionSource.ITEM;
      path: Paths<OrderItem>;
      operator: ConditionOperator;
      value: unknown;
    };

// "Ветка" дерева - это логическая группа.
// Она содержит массив, который может состоять из других групп или листьев.
// Это и есть рекурсия.
type ConditionGroup = {
  AND?: PriceModifierCondition[];
  OR?: PriceModifierCondition[];
};

// Финальный тип - это либо "ветка", либо "лист".
export type PriceModifierCondition = ConditionGroup | LeafCondition;
