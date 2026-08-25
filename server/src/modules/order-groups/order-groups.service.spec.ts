import type { DataSource, EntityManager, Repository } from 'typeorm';

import { OrderGroup, OrderStatus } from './entities/order-group.entity';
import { OrderGroupsService } from './order-groups.service';
import type { Order } from '../orders/entities/order.entity';
import type { PricingService } from '../pricing/pricing.service';

describe('OrderGroupsService', () => {
  const preload = jest.fn();
  const save = jest.fn();
  const transaction = jest.fn();
  const calculateProductionCost = jest.fn();
  const service = new OrderGroupsService(
    { preload, save } as unknown as Repository<OrderGroup>,
    {} as Repository<Order>,
    { transaction } as unknown as DataSource,
    { calculateProductionCost } as unknown as PricingService,
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

  it('rolls back every item when one production formula fails', async () => {
    const saveOrders = jest.fn();
    const group = {
      id: 1,
      orders: [
        {
          id: 'order-1',
          characteristics: {},
          items: [
            { id: 'item-1', template: {} },
            { id: 'item-2', template: {} },
          ],
        },
      ],
    } as OrderGroup;
    const manager = {
      getRepository: (entity: unknown) =>
        entity === OrderGroup
          ? { findOne: jest.fn().mockResolvedValue(group) }
          : { save: saveOrders },
    } as unknown as EntityManager;
    transaction.mockImplementation(
      (callback: (entityManager: EntityManager) => Promise<unknown>) =>
        callback(manager),
    );
    calculateProductionCost
      .mockReturnValueOnce({ results: [], totalCost: 10 })
      .mockImplementationOnce(() => {
        throw new Error('Ошибка формулы');
      });

    const result = await service.recalculateProduction(1);

    expect(result).toEqual({
      updatedItems: 0,
      errors: [
        {
          orderId: 'order-1',
          itemId: 'item-2',
          message: 'Ошибка формулы',
        },
      ],
    });
    expect(saveOrders).not.toHaveBeenCalled();
  });
});
