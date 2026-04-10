export const COLOR_TYPE = {
  STAIN: 'stain',
  ENAMEL: 'enamel',
} as const;

export type ColorType = (typeof COLOR_TYPE)[keyof typeof COLOR_TYPE];

export type Color = {
  id: string;
  name: string;
  type: ColorType;
  createdAt: Date;
  updatedAt: Date;
};

export interface Customer {
  id: string;
  name: string;
  level: 'bronze' | 'silver' | 'gold';
}

export type FacadePanelCharacteristics = {
  style?: string;
};

export type FacadePanel = {
  id: string;
  name: string;
  characteristics: FacadePanelCharacteristics;
  createdAt: Date;
  updatedAt: Date;
};

export type FacadeProfileCharacteristics = {
  width: number;
  /** Глубина паза под филёнку, мм */
  grooveDepth: number;
  /** Ширина паза под филёнку, мм  */
  grooveWidth?: number;
  style?: string;
};

export type FacadeProfile = {
  id: string;
  name: string;
  characteristics: FacadeProfileCharacteristics;
  createdAt: Date;
  updatedAt: Date;
};

export const MATERIAL_TYPE = {
  SOFTWOOD: 'softwood',
  HARDWOOD: 'hardwood',
  MDF: 'mdf',
} as const;

export type MaterialType = (typeof MATERIAL_TYPE)[keyof typeof MATERIAL_TYPE];

export type Material = {
  id: string;
  name: string;
  type: MaterialType;
  createdAt: Date;
  updatedAt: Date;
};

export type Patina = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

export const CUSTOMER_PRICING_METHOD = {
  PER_ITEM: 'per_item',
  AREA: 'area',
  VOLUME: 'volume',
} as const;

export type CustomerPricingMethod =
  (typeof CUSTOMER_PRICING_METHOD)[keyof typeof CUSTOMER_PRICING_METHOD];

export type ProductCharacteristics = {
  width?: number;
  height?: number;
  thickness?: number;
};

export type ProductTemplate = {
  id: string;
  name: string;
  defaultCharacteristics: ProductCharacteristics;
  customerPricingMethod: CustomerPricingMethod;
  baseCustomerPrice: number;
  attributes: object;
  group?: string;
};

export const CALCULATION_METHOD = {
  PER_ITEM: 'per_item',
  AREA: 'area',
  VOLUME: 'volume',
} as const;

export type CalculationMethod =
  (typeof CALCULATION_METHOD)[keyof typeof CALCULATION_METHOD];

export type ProductionOperation = {
  id: string;
  name: string;
  calculationMethod: CalculationMethod;
  costPerUnit: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Varnish = {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

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

export type OrderMaterial = {
  name: string;
  type: Material['type'];
};

export type OrderColor = {
  name: string;
  type: Color['type'];
};

export type OrderPatina = {
  name: string;
};

export type OrderFacadePanel = {
  name: string;
  characteristics: FacadePanel['characteristics'];
};

export type OrderFacadeProfile = {
  name: string;
  characteristics: FacadeProfile['characteristics'];
};

export type OrderVarnish = {
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
