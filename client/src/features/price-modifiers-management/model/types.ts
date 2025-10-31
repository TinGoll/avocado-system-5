import type { Order, OrderItem } from '@entities/order';
import type {
  CONDITION_SOURCE,
  ConditionOperator,
} from '@entities/price-modifiers';

type Primitives = string | number | boolean | Date | null | undefined;

type Paths<T, TPrefix extends string = ''> = {
  [K in keyof T]: T[K] extends Primitives
    ? `${TPrefix}${K & string}`
    : T[K] extends (infer U)[]
      ? U extends Primitives
        ? `${TPrefix}${K & string}`
        : never
      : Paths<T[K], `${TPrefix}${K & string}.`>;
}[keyof T];

export type OrderPath = Paths<Order>;
export type ItemPath = Paths<OrderItem>;

export type LeafCondition =
  | {
      source: typeof CONDITION_SOURCE.ORDER;
      path: OrderPath;
      operator: ConditionOperator;
      value: string | number;
    }
  | {
      source: typeof CONDITION_SOURCE.ITEM;
      path: ItemPath;
      operator: ConditionOperator;
      value: string | number;
    };

export type FieldLabelsNode = {
  _title: string;
  children?: { [key: string]: FieldLabelsNode };
};

export type LabelsMap<T> = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  [K in keyof T]-?: T[K] extends Primitives | (infer _U)[]
    ? { _title: string }
    : {
        _title: string;
        children: LabelsMap<T[K]>;
      };
};
