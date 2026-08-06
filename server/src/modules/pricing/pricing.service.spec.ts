import { Repository } from 'typeorm';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Order } from '../orders/entities/order.entity';
import { PriceModifier } from '../price-modifiers/entities/price-modifier.entity';
import { CustomerPricingMethod } from '../products/entities/product-template.entity';
import { PricingService } from './pricing.service';

describe('PricingService', () => {
  it('calculates a linear-meter price using product height', async () => {
    const modifiersRepository = {
      find: jest.fn().mockResolvedValue([]),
    } as unknown as Repository<PriceModifier>;
    const service = new PricingService(modifiersRepository);
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

    await expect(
      service.calculateCustomerPrice(item, {} as Order),
    ).resolves.toBe(750);
  });
});
