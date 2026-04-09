import type { CalculationMethod } from '@entities/production-operation';

export type FieldType = {
  name: string;
  calculationMethod: CalculationMethod;
  costPerUnit: number;
};
