export const Endpoints = {
  COLORS: 'colors',
  FACADE_PROFILES: 'facade-profiles',
  MATERIALS: 'materials',
  FACADE_PANELS: 'panels',
  PATINAS: 'patinas',
  PRICE_MODIFIERS: 'price-modifiers',
  PRODUCTION_OPERAIONS: 'production-operations',
  PRODUCTS: 'products',
  VARNISHES: 'varnishes',
} as const;

export type Endpoints = (typeof Endpoints)[keyof typeof Endpoints];
