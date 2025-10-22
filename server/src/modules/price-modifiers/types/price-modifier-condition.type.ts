import { Paths } from 'src/shared/utils/object-helpers';
import {
  ConditionOperator,
  ConditionSource,
} from '../entities/price-modifier.entity';
import { Order } from 'src/modules/orders/entities/order.entity';
import { OrderItem } from 'src/modules/orders/entities/order-item.entity';

// Базовый тип для условия заказа
interface OrderCondition {
  source: ConditionSource.ORDER;
  path: Paths<Order>;
  operator: ConditionOperator;
  value: unknown;
}

// Базовый тип для условия элемента заказа
interface ItemCondition {
  source: ConditionSource.ITEM;
  path: Paths<OrderItem>;
  operator: ConditionOperator;
  value: unknown;
}

// Дискриминированное объединение: наш финальный тип!
export type PriceModifierCondition = OrderCondition | ItemCondition;
