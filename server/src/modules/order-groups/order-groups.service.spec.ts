import type { Repository } from 'typeorm';

import { OrderGroup, OrderStatus } from './entities/order-group.entity';
import { OrderGroupsService } from './order-groups.service';
import type { Order } from '../orders/entities/order.entity';

describe('OrderGroupsService', () => {
  const preload = jest.fn();
  const save = jest.fn();
  const service = new OrderGroupsService(
    { preload, save } as unknown as Repository<OrderGroup>,
    {} as Repository<Order>,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('moves a draft order group into production', async () => {
    const group = {
      id: 1,
      status: OrderStatus.IN_PRODUCTION,
    } as OrderGroup;
    preload.mockResolvedValue(group);
    save.mockResolvedValue(group);

    const result = await service.update(1, {
      status: OrderStatus.IN_PRODUCTION,
    });

    expect(preload).toHaveBeenCalledWith({
      id: 1,
      status: OrderStatus.IN_PRODUCTION,
    });
    expect(save).toHaveBeenCalledWith(group);
    expect(result.status).toBe(OrderStatus.IN_PRODUCTION);
  });
});
