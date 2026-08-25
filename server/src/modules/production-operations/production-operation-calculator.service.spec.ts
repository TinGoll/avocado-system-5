import { BadRequestException } from '@nestjs/common';
import { ProductionOperationCalculatorService } from './production-operation-calculator.service';

describe('ProductionOperationCalculatorService', () => {
  const service = new ProductionOperationCalculatorService();

  const getCalculationError = (action: () => unknown) => {
    try {
      action();
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      return (error as BadRequestException).getResponse() as {
        code: string;
        field: string;
        variable?: string;
      };
    }
    throw new Error('Expected calculation to fail');
  };

  it('calculates panel geometry, quantity and rendered name from a profile snapshot', () => {
    const context = service.contextFromSnapshot(
      { width: 540, height: 900, quantity: 1 },
      {
        profile: {
          name: 'Profile',
          characteristics: { width: 68, grooveDepth: 8 },
        },
      },
    );

    const result = service.calculate(
      'panelWidth / 1000 * panelHeight / 1000 * item.quantity',
      'Филёнка: {{ panelHeight }}х{{ panelWidth }} — {{ item.quantity }} шт.',
      context,
    );

    expect(result).toEqual({
      panelWidth: 420,
      panelHeight: 780,
      calculatedQuantity: result.calculatedQuantity,
      renderedName: 'Филёнка: 780х420 — 1 шт.',
    });
    expect(result.calculatedQuantity).toBeCloseTo(0.3276);
  });

  it.each([
    ['Math.round(item.width)', 'UNKNOWN_VARIABLE'],
    ['item.width / 0', 'DIVISION_BY_ZERO'],
    ['0 - item.quantity', 'NEGATIVE_RESULT'],
  ])('rejects unsafe or invalid formula %s', (formula, code) => {
    const error = getCalculationError(() =>
      service.calculate(formula, 'Работа', {
        item: { width: 500, quantity: 1 },
      }),
    );

    expect(error.code).toBe(code);
  });

  it('binds missing template values to displayNameTemplate', () => {
    const error = getCalculationError(() =>
      service.calculate('item.quantity', '{{ panelWidth }}', {
        item: { quantity: 1 },
      }),
    );

    expect(error).toEqual({
      code: 'MISSING_VALUE',
      field: 'displayNameTemplate',
      message: 'Выберите профиль заказа для расчёта размера филёнки.',
      variable: 'panelWidth',
    });
  });

  it('asks to select an order profile when panel geometry is required', () => {
    const error = getCalculationError(() =>
      service.calculate('panelWidth * item.quantity', 'Работа', {
        item: { width: 500, quantity: 1 },
      }),
    );

    expect(error).toEqual({
      code: 'MISSING_VALUE',
      field: 'calculationFormula',
      message: 'Выберите профиль заказа для расчёта размера филёнки.',
      variable: 'panelWidth',
    });
  });

  it('renders the product name in the display-name template', () => {
    const result = service.calculate(
      'item.quantity',
      '{{ item.name }} — {{ item.quantity }} шт.',
      { item: { name: 'Фасад прямой', quantity: 2 } },
    );

    expect(result.renderedName).toBe('Фасад прямой — 2 шт.');
  });

  it('renders profile and panel names from the order snapshot', () => {
    const context = service.contextFromSnapshot(
      { quantity: 1 },
      {
        profile: { name: 'Классика', characteristics: {} },
        panel: { name: 'Гладкая филёнка', characteristics: {} },
      },
    );

    const result = service.calculate(
      'item.quantity',
      '{{ profile.name }} / {{ panel.name }}',
      context,
    );

    expect(result.renderedName).toBe('Классика / Гладкая филёнка');
  });
});
