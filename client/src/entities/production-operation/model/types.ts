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
