import { Repository } from 'typeorm';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import {
  ConditionOperator,
  ConditionSource,
  ModifierType,
  PriceModifier,
} from '../price-modifiers/entities/price-modifier.entity';
import { CustomerPricingMethod } from '../products/entities/product-template.entity';
import { PricingService } from './pricing.service';

const alwaysApplicableCondition = {
  source: ConditionSource.ORDER,
  path: 'status',
  operator: ConditionOperator.EQ,
  value: 'new',
};

const createModifier = (
  id: string,
  priority: number,
  type: ModifierType,
  value: number,
): PriceModifier =>
  ({
    id,
    priority,
    type,
    value,
    conditions: alwaysApplicableCondition,
    productTemplates: [],
  }) as PriceModifier;

const createItem = (baseCustomerPrice = 100): OrderItem =>
  ({
    quantity: 1,
    template: { id: 'template-id' },
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
    service: new PricingService(modifiersRepository),
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
});
