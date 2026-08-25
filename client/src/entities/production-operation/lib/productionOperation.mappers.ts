import type { CalculationMethod } from '../model/production-operation';

export const calculationMethodNameMap: Record<CalculationMethod, string> = {
  per_item: 'Штука',
  linear_meter: 'Погонный метр',
  area: 'Квадратура',
  volume: 'Кубатура',
};

export const calculationMethodShortNameMap: Record<CalculationMethod, string> =
  {
    per_item: 'шт.',
    linear_meter: 'м',
    area: 'м. кв.',
    volume: 'м. куб.',
  };
