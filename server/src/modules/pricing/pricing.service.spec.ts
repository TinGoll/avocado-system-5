import { Repository } from 'typeorm';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import {
  ConditionOperator,
  ConditionSource,
  ModifierType,
  PriceModifier,
} from '../price-modifiers/entities/price-modifier.entity';
import {
  CustomerPricingMethod,
  ProductTemplate,
} from '../products/entities/product-template.entity';
import { PricingService } from './pricing.service';
import { ProductionOperationCalculatorService } from '../production-operations/production-operation-calculator.service';
import {
  CalculationMethod,
  ProductionOperation,
} from '../production-operations/entities/production-operation.entity';

const alwaysApplicableCondition = {
  source: ConditionSource.ITEM,
  path: 'quantity',
  operator: ConditionOperator.GTE,
  value: 1,
};

const createModifier = (
  id: string,
  priority: number,
  type: ModifierType,
  value: number,
  templateIds: string[] = [],
): PriceModifier =>
  ({
    id,
    priority,
    type,
    value,
    conditions: alwaysApplicableCondition,
    productTemplates: templateIds.map((templateId) => ({ id: templateId })),
  }) as PriceModifier;

const createItem = (
  baseCustomerPrice = 100,
  templateId = 'template-id',
): OrderItem =>
  ({
    quantity: 1,
    template: { id: templateId },
    snapshot: {
      customerPricingMethod: CustomerPricingMethod.PER_ITEM,
      baseCustomerPrice,
    },
  }) as OrderItem;

const order = { status: 'new' } as Order;

const createService = (modifiers: PriceModifier[]) => {
  const findMock = jest.fn().mockResolvedValue(modifiers);
  const modifiersRepository = {
    find: findMock,
  } as unknown as jest.Mocked<Repository<PriceModifier>>;

  return {
    service: new PricingService(
      modifiersRepository,
      new ProductionOperationCalculatorService(),
    ),
    findMock,
  };
};

describe('PricingService', () => {
  it('calculates a linear-meter price using product height', async () => {
    const { service } = createService([]);
    const item = {
      quantity: 3,
      snapshot: {
        customerPricingMethod: CustomerPricingMethod.LINEAR_METER,
        baseCustomerPrice: 100,
      },
      characteristics: {
        height: 2500,
      },
    } as OrderItem;

    await expect(service.calculateCustomerPrice(item, order)).resolves.toBe(
      750,
    );
  });

  it('applies multiple percentage modifiers sequentially', async () => {
    const { service } = createService([
      createModifier(
        '00000000-0000-4000-8000-000000000001',
        10,
        ModifierType.PERCENTAGE,
        10,
      ),
      createModifier(
        '00000000-0000-4000-8000-000000000002',
        20,
        ModifierType.PERCENTAGE,
        20,
      ),
    ]);

    await expect(
      service.calculateCustomerPrice(createItem(), order),
    ).resolves.toBeCloseTo(132);
  });

  it('applies percentage and fixed modifiers in priority order', async () => {
    const { service } = createService([
      createModifier(
        '00000000-0000-4000-8000-000000000001',
        10,
        ModifierType.FIXED_AMOUNT,
        50,
      ),
      createModifier(
        '00000000-0000-4000-8000-000000000002',
        20,
        ModifierType.PERCENTAGE,
        10,
      ),
    ]);

    await expect(
      service.calculateCustomerPrice(createItem(), order),
    ).resolves.toBeCloseTo(165);
  });

  it('uses UUID as a stable tie-breaker for equal priorities', async () => {
    const { service, findMock } = createService([
      createModifier(
        '00000000-0000-4000-8000-000000000001',
        10,
        ModifierType.FIXED_AMOUNT,
        50,
      ),
      createModifier(
        '00000000-0000-4000-8000-000000000002',
        10,
        ModifierType.PERCENTAGE,
        10,
      ),
    ]);

    await expect(
      service.calculateCustomerPrice(createItem(), order),
    ).resolves.toBeCloseTo(165);
    expect(findMock).toHaveBeenCalledWith({
      relations: { productTemplates: true },
      order: { priority: 'ASC', id: 'ASC' },
    });
  });

  it('supports negative percentage and fixed values as discounts', async () => {
    const { service } = createService([
      createModifier(
        '00000000-0000-4000-8000-000000000001',
        10,
        ModifierType.PERCENTAGE,
        -10,
      ),
      createModifier(
        '00000000-0000-4000-8000-000000000002',
        20,
        ModifierType.FIXED_AMOUNT,
        -5,
      ),
    ]);

    await expect(
      service.calculateCustomerPrice(createItem(), order),
    ).resolves.toBeCloseTo(85);
  });

  it('loads modifiers once when calculating multiple items', async () => {
    const { service, findMock } = createService([
      createModifier(
        '00000000-0000-4000-8000-000000000001',
        10,
        ModifierType.PERCENTAGE,
        10,
      ),
    ]);

    await expect(
      service.calculateCustomerPrices(
        [createItem(100), createItem(200), createItem(300)],
        order,
      ),
    ).resolves.toEqual([110, 220, 330]);
    expect(findMock).toHaveBeenCalledTimes(1);
  });

  it('returns the same prices for batch and single-item calculations', async () => {
    const modifiers = [
      createModifier(
        '00000000-0000-4000-8000-000000000001',
        10,
        ModifierType.PERCENTAGE,
        10,
      ),
      createModifier(
        '00000000-0000-4000-8000-000000000002',
        20,
        ModifierType.FIXED_AMOUNT,
        5,
      ),
    ];
    const { service } = createService(modifiers);
    const items = [createItem(100), createItem(200)];

    const batchPrices = await service.calculateCustomerPrices(items, order);
    const singlePrices = await Promise.all(
      items.map((item) => service.calculateCustomerPrice(item, order)),
    );

    expect(batchPrices).toEqual(singlePrices);
  });

  it('applies global and template-scoped modifiers to matching items', async () => {
    const { service } = createService([
      createModifier(
        '00000000-0000-4000-8000-000000000001',
        10,
        ModifierType.PERCENTAGE,
        10,
      ),
      createModifier(
        '00000000-0000-4000-8000-000000000002',
        20,
        ModifierType.FIXED_AMOUNT,
        25,
        ['scoped-template'],
      ),
    ]);

    await expect(
      service.calculateCustomerPrices(
        [createItem(100, 'scoped-template'), createItem(100, 'other-template')],
        order,
      ),
    ).resolves.toEqual([135, 110]);
  });

  it('does not apply a legacy modifier that uses a calculated path', async () => {
    const modifier = createModifier(
      '00000000-0000-4000-8000-000000000001',
      10,
      ModifierType.PERCENTAGE,
      50,
    );
    modifier.conditions = {
      source: ConditionSource.ITEM,
      path: 'calculatedCustomerPrice',
      operator: ConditionOperator.GT,
      value: 0,
    };
    const { service } = createService([modifier]);
    const item = createItem();
    item.calculatedCustomerPrice = 100;

    await expect(service.calculateCustomerPrice(item, order)).resolves.toBe(
      100,
    );
  });

  it('calculates and snapshots each production operation', () => {
    const { service } = createService([]);
    const item = {
      quantity: 2,
      characteristics: { width: 500, height: 800 },
    } as OrderItem;
    const operation = {
      id: 'operation-1',
      name: 'Филёнка',
      calculationMethod: CalculationMethod.AREA,
      calculationFormula:
        'panelWidth / 1000 * panelHeight / 1000 * item.quantity',
      displayNameTemplate:
        'Филёнка: {{ panelHeight }}х{{ panelWidth }} — {{ item.quantity }} шт.',
      costPerUnit: 100,
    } as ProductionOperation;
    const template = new ProductTemplate();
    template.operations = [operation];

    const result = service.calculateProductionCost(item, template, {
      profile: { characteristics: { width: 50, grooveDepth: 10 } },
    });

    expect(result).toEqual({
      results: [
        {
          operationId: operation.id,
          originalName: operation.name,
          calculationFormula: operation.calculationFormula,
          displayNameTemplate: operation.displayNameTemplate,
          calculationMethod: operation.calculationMethod,
          costPerUnit: 100,
          calculatedQuantity: 0.6048,
          renderedName: 'Филёнка: 720х420 — 2 шт.',
          totalCost: 60.48,
        },
      ],
      totalCost: 60.48,
    });
  });
});
