import { NotFoundException } from '@nestjs/common';
import type { OrderManagementService } from '../order-management/order-management.service';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import { OrderGroup, OrderStatus } from './entities/order-group.entity';
import { OrderGroupsService } from './order-groups.service';
import type { Order } from '../orders/entities/order.entity';
import type { PricingService } from '../pricing/pricing.service';
import type { Customer } from '../customers/entities/customer.entity';

describe('OrderGroupsService', () => {
  const findOneBy = jest.fn();
  const updateGroup = jest.fn();
  const save = jest.fn();
  const create = jest.fn();
  const update = jest.fn();
  const findCustomer = jest.fn();
  const transaction = jest.fn();
  const calculateProductionCost = jest.fn();
  const service = new OrderGroupsService(
    { findOneBy, save, create, update } as unknown as Repository<OrderGroup>,
    { findOneBy: findCustomer } as unknown as Repository<Customer>,
    {} as Repository<Order>,
    { transaction } as unknown as DataSource,
    { calculateProductionCost } as unknown as PricingService,
    { updateGroup } as unknown as OrderManagementService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a customer snapshot from the referenced customer', async () => {
    const customer = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Заказчик',
      level: 'gold',
      attributes: { segment: 'vip' },
    } as Customer;
    findCustomer.mockResolvedValue(customer);
    create.mockReturnValue({
      orderNumber: 'ORDER-1',
      customerId: customer.id,
      customer,
    });
    save.mockResolvedValue({
      orderNumber: 'ORDER-1',
      customerId: customer.id,
      customer,
    });

    const result = await service.create({
      orderNumber: 'ORDER-1',
      customerId: customer.id,
    });

    expect(result).toMatchObject({
      customerId: customer.id,
      customer: {
        id: customer.id,
        name: customer.name,
        level: customer.level,
        attributes: customer.attributes,
      },
    });
  });

  it('rejects a missing customer when creating an order group', async () => {
    findCustomer.mockResolvedValue(null);

    await expect(
      service.create({
        orderNumber: 'ORDER-2',
        customerId: '22222222-2222-4222-8222-222222222222',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(save).not.toHaveBeenCalled();
  });

  it('updates the customer link and snapshot together', async () => {
    const customer = {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Новый заказчик',
      level: 'silver',
      attributes: {},
    } as Customer;
    findCustomer.mockResolvedValue(customer);
    findOneBy.mockResolvedValue({ id: 1 });

    await service.update(1, { customerId: customer.id });

    expect(update).toHaveBeenCalledTimes(1);
    const [updatedId, updatePayload] = update.mock.calls[0] as [
      number,
      Partial<OrderGroup>,
    ];
    expect(updatedId).toBe(1);
    expect(updatePayload.customerId).toBe(customer.id);
    expect(updatePayload.customer).toMatchObject({ name: customer.name });
  });

  it('clears both the customer link and snapshot', async () => {
    findOneBy.mockResolvedValue({ id: 1 });

    await service.update(1, { customerId: null });

    expect(update).toHaveBeenCalledWith(1, {
      customerId: null,
      customer: {},
    });
  });

  it('moves a draft order group into production', async () => {
    const group = {
      id: 1,
      status: OrderStatus.IN_PRODUCTION,
    } as OrderGroup;
    findOneBy.mockResolvedValue(group);
    save.mockResolvedValue(group);

    const result = await service.update(1, {
      status: OrderStatus.IN_PRODUCTION,
      expectedVersion: 0,
    });

    expect(updateGroup).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        status: OrderStatus.IN_PRODUCTION,
        expectedVersion: 0,
      }),
      {},
    );
    expect(save).not.toHaveBeenCalled();
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
