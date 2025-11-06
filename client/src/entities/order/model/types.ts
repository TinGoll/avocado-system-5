// Вроде бы принцип FSD не запрещает импорт type-leve зависимостей :)
import type { Color } from '@entities/color';
import type { Customer } from '@entities/customer';
import type { FacadePanel } from '@entities/facade-panel';
import type { FacadeProfile } from '@entities/facade-profile';
import type { Material } from '@entities/material';
import type { ProductTemplate } from '@entities/product';

export const ORDER_STATUS = {
  DRAFT: 'draft',
  IN_PRODUCTION: 'in_production',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export type Snapshot = {
  name: string;
  baseCustomerPrice: number;
  attributes: object;
  customerPricingMethod: ProductTemplate['customerPricingMethod'];
  defaultCharacteristics: ProductTemplate['defaultCharacteristics'];
};

type OrderMaterial = {
  name: string;
  type: Material['type'];
};

type OrderColor = {
  name: string;
  type: Color['type'];
};

type OrderPatina = {
  name: string;
};

type OrderFacadePanel = {
  name: string;
  characteristics: FacadePanel['characteristics'];
};

type OrderFacadeProfile = {
  name: string;
  characteristics: FacadeProfile['characteristics'];
};

type OrderVarnish = {
  name: string;
};

export interface OrderCharacteristics {
  material?: OrderMaterial;
  color?: OrderColor;
  patina?: OrderPatina;
  panel?: OrderFacadePanel;
  profile?: OrderFacadeProfile;
  varnish?: OrderVarnish;
}

export interface OrderItemCharacteristics {
  width?: number;
  height?: number;
  thickness?: number;
}

export interface OrderGroup {
  id: number;
  orderNumber: string;
  customer: Customer;
  status: OrderStatus;
  startedAt?: Date;
  orderCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  characteristics: OrderCharacteristics;
  totalPrice: number;
  items: OrderItem[];

  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  template: ProductTemplate;
  quantity: number;
  snapshot: Snapshot;
  characteristics: OrderItemCharacteristics;
  calculatedProductionCost: number;
  calculatedCustomerPrice: number;
}
