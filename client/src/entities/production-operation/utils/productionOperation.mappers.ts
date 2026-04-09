import type { CalculationMethod } from '../model/production-operation';

export const calculationMethodNameMap: Record<CalculationMethod, string> = {
  per_item: 'Штука',
  area: 'Квадратура',
  volume: 'Кубатура',
};

export const calculationMethodShortNameMap: Record<CalculationMethod, string> =
  {
    per_item: 'шт.',
    area: 'м. кв.',
    volume: 'м. куб.',
  };
