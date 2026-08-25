import type { CalculationMethod } from '@entities/production-operation';

export type FieldType = {
  name: string;
  calculationMethod: CalculationMethod;
  calculationFormula: string;
  displayNameTemplate: string;
  costPerUnit: number;
  preview: {
    name?: string;
    width: number;
    height: number;
    thickness?: number;
    quantity: number;
    profileWidth?: number;
    grooveDepth?: number;
  };
};
