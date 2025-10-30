import type {
  CONDITION_SOURCE,
  ConditionOperator,
} from '@entities/price-modifiers';

export interface Customer {
  id: string;
  name: string;
  level: 'bronze' | 'silver' | 'gold';
  address: {
    city: string;
    street: string;
  };
}

export interface Item {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  productDetails: {
    name: string;
    category: string;
    weight: number;
  };
}

export interface Order {
  id: string;
  totalPrice: number;
  itemCount: number;
  customer: Customer;
  items: Item[];
}

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
export type ItemPath = Paths<Item>;

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
