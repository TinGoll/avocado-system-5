import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';

import { PricingService } from '../pricing/pricing.service';
import { OrderGroup } from '../order-groups/entities/order-group.entity';
import {
  CustomerPricingMethod,
  ProductTemplate,
} from '../products/entities/product-template.entity';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';

describe('OrdersService price recalculation', () => {
  const findOne = jest.fn();
  const save = jest.fn();
  const findProduct = jest.fn();
  const calculateCustomerPrices = jest.fn();
  const calculateProductionCost = jest.fn();
  const calculateCustomerPrice = jest.fn();

  const service = new OrdersService(
    { findOne, save } as unknown as Repository<Order>,
    { findOne: findProduct } as unknown as Repository<ProductTemplate>,
    {
      calculateCustomerPrices,
      calculateCustomerPrice,
      calculateProductionCost,
    } as unknown as PricingService,
    {} as Repository<OrderGroup>,
    {} as Repository<OrderItem>,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recalculates every saved item and the order total using current data', async () => {
    const firstItem = {
      id: 'item-1',
      quantity: 2,
      template: {},
      calculatedProductionCost: 1,
      calculatedCustomerPrice: 10,
    } as OrderItem;
    const secondItem = {
      id: 'item-2',
      quantity: 3,
      template: {},
      calculatedProductionCost: 2,
      calculatedCustomerPrice: 20,
    } as OrderItem;
    const order = {
      id: 'order-1',
      items: [firstItem, secondItem],
      totalPrice: 30,
      orderGroup: { id: 1 },
    } as Order;

    findOne.mockResolvedValue(order);
    calculateCustomerPrices.mockResolvedValue([125, 275]);
    calculateProductionCost.mockReturnValueOnce(15).mockReturnValueOnce(20);
    save.mockImplementation((entity: Order) => Promise.resolve(entity));

    const result = await service.recalculatePrices(order.id);

    expect(findOne).toHaveBeenCalledWith({
      where: { id: order.id },
      relations: {
        items: { template: true },
        orderGroup: true,
      },
      order: { items: { position: 'ASC' } },
    });
    expect(calculateCustomerPrices).toHaveBeenCalledWith(order.items, order);
    expect(firstItem.calculatedProductionCost).toBe(30);
    expect(secondItem.calculatedProductionCost).toBe(60);
    expect(firstItem.calculatedCustomerPrice).toBe(125);
    expect(secondItem.calculatedCustomerPrice).toBe(275);
    expect(result.totalPrice).toBe(400);
    expect(save).toHaveBeenCalledWith(order);
  });

  it('does not create prices for a missing order', async () => {
    findOne.mockResolvedValue(null);

    await expect(service.recalculatePrices('missing')).rejects.toThrow(
      NotFoundException,
    );
    expect(calculateCustomerPrices).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('loads item templates when adding an item to an order', async () => {
    const existingTemplate = { id: 'template-1' } as ProductTemplate;
    const existingItem = {
      id: 'item-1',
      template: existingTemplate,
      calculatedCustomerPrice: 10,
    } as OrderItem;
    const order = {
      id: 'order-1',
      items: [existingItem],
      totalPrice: 10,
    } as Order;
    const newTemplate = {
      id: 'template-2',
      name: 'New template',
      attributes: {},
      defaultCharacteristics: {},
      baseCustomerPrice: 100,
      customerPricingMethod: 'per_item',
    } as ProductTemplate;

    findOne.mockResolvedValue(order);
    findProduct.mockResolvedValue(newTemplate);
    calculateProductionCost.mockReturnValue(20);
    calculateCustomerPrice.mockResolvedValue(30);
    save.mockImplementation((entity: Order) => Promise.resolve(entity));

    const result = await service.addItemToOrder(order.id, {
      templateId: newTemplate.id,
      quantity: 1,
      characteristics: {},
    });

    expect(findOne).toHaveBeenCalledWith({
      where: { id: order.id },
      relations: { items: { template: true }, orderGroup: true },
    });
    expect(result.items[0].template).toBe(existingTemplate);
    expect(result.items[1].template).toBe(newTemplate);
  });

  it('updates the item pricing method snapshot and recalculates prices', async () => {
    const item = {
      id: 'item-1',
      position: 0,
      quantity: 1,
      template: { id: 'template-1' },
      snapshot: {
        customerPricingMethod: CustomerPricingMethod.PER_ITEM,
      },
      calculatedProductionCost: 10,
      calculatedCustomerPrice: 20,
    } as OrderItem;
    const order = {
      id: 'order-1',
      items: [item],
      totalPrice: 20,
    } as Order;

    findOne.mockResolvedValue(order);
    calculateCustomerPrices.mockResolvedValue([60]);
    calculateProductionCost.mockReturnValue(10);
    save.mockImplementation((entity: Order) => Promise.resolve(entity));

    const result = await service.updateItemInOrder(order.id, item.id, {
      customerPricingMethod: CustomerPricingMethod.AREA,
    });

    expect(item.snapshot.customerPricingMethod).toBe(
      CustomerPricingMethod.AREA,
    );
    expect(calculateCustomerPrices).toHaveBeenCalledWith(order.items, order);
    expect(result.totalPrice).toBe(60);
  });
});
