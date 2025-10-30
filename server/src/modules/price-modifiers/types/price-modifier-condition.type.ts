import { Paths } from 'src/shared/utils/object-helpers';
import {
  ConditionOperator,
  ConditionSource,
} from '../entities/price-modifier.entity';
import { Order } from 'src/modules/orders/entities/order.entity';
import { OrderItem } from 'src/modules/orders/entities/order-item.entity';
import { OrderGroup } from 'src/modules/order-groups/entities/order-group.entity';

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
    }
  | {
      source: ConditionSource.ORDER_GROUP;
      path: Paths<OrderGroup>;
      operator: ConditionOperator;
      value: unknown;
    };

type ConditionGroup = {
  AND?: PriceModifierCondition[];
  OR?: PriceModifierCondition[];
};

export type PriceModifierCondition = ConditionGroup | LeafCondition;
