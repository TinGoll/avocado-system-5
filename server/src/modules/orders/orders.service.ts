import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Repository } from 'typeorm';
import { ProductTemplate } from '../products/entities/product-template.entity';
import { OrderItem } from './entities/order-item.entity';
import { PricingService } from '../pricing/pricing.service';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { OrderGroup } from '../order-groups/entities/order-group.entity';
import { UpdateOrderItemDto } from './dto/update-order-item.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(ProductTemplate)
    private readonly productsRepository: Repository<ProductTemplate>,
    private readonly pricingService: PricingService,
    @InjectRepository(OrderGroup)
    private readonly groupsRepository: Repository<OrderGroup>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
  ) {}

  async create(createDto: CreateOrderDto): Promise<Order> {
    const { items, orderGroupId, ...orderData } = createDto;

    const order = this.ordersRepository.create(orderData);

    if (orderGroupId) {
      const group = await this.groupsRepository.findOneBy({ id: orderGroupId });
      if (!group) {
        throw new BadRequestException(
          `Order Group with ID "${orderGroupId}" not found.`,
        );
      }
      order.orderGroup = group;
    }

    order.items = await Promise.all(
      items.map(async (itemDto, position) => {
        const item = await this.createOrderItem(itemDto, order);
        item.position = position;
        return item;
      }),
    );

    this.recalculateOrderTotal(order);

    return this.ordersRepository.save(order);
  }

  async copy(id: string, name?: string): Promise<Order> {
    const source = await this.ordersRepository.findOne({
      where: { id },
      relations: { items: { template: true }, orderGroup: true },
      order: { items: { position: 'ASC' } },
    });

    if (!source) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    const copy = this.ordersRepository.create({
      name: name ?? `Копия ${source.name ?? 'документа'}`,
      characteristics: structuredClone(source.characteristics),
      totalPrice: source.totalPrice,
      orderGroup: source.orderGroup,
      items: source.items.map((item) =>
        this.orderItemsRepository.create({
          template: item.template,
          quantity: item.quantity,
          position: item.position,
          snapshot: structuredClone(item.snapshot),
          characteristics: structuredClone(item.characteristics),
          calculatedProductionCost: item.calculatedProductionCost,
          calculatedCustomerPrice: item.calculatedCustomerPrice,
        }),
      ),
    });

    return this.ordersRepository.save(copy);
  }

  async addItemToOrder(
    orderId: string,
    createItemDto: CreateOrderItemDto,
  ): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: { items: { template: true }, orderGroup: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    const newOrderItem = await this.createOrderItem(createItemDto, order);
    newOrderItem.position = order.items.length;
    order.items.push(newOrderItem);
    this.recalculateOrderTotal(order);

    return this.ordersRepository.save(order);
  }

  async updateItemInOrder(
    orderId: string,
    itemId: string,
    updateItemDto: UpdateOrderItemDto,
  ): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: { items: { template: true }, orderGroup: true },
      order: { items: { position: 'ASC' } },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    const itemToUpdate = order.items.find((item) => item.id === itemId);
    if (!itemToUpdate) {
      throw new NotFoundException(
        `Order item with ID "${itemId}" not found in order "${orderId}"`,
      );
    }

    const { templateId, attributes, customerPricingMethod, ...itemUpdates } =
      updateItemDto;

    if (templateId && templateId !== itemToUpdate.template.id) {
      const template = await this.productsRepository.findOne({
        where: { id: templateId },
        relations: { operations: true },
      });

      if (!template) {
        throw new BadRequestException(
          `Product template with ID "${templateId}" not found.`,
        );
      }

      itemToUpdate.template = template;
      itemToUpdate.snapshot = {
        name: template.name,
        baseCustomerPrice: template.baseCustomerPrice,
        attributes: template.attributes,
        customerPricingMethod: template.customerPricingMethod,
        defaultCharacteristics: template.defaultCharacteristics,
      };
      itemToUpdate.characteristics = {
        ...template.defaultCharacteristics,
        ...itemToUpdate.characteristics,
      };
    }

    if (attributes) {
      itemToUpdate.snapshot = {
        ...itemToUpdate.snapshot,
        attributes,
      };
    }

    if (customerPricingMethod) {
      itemToUpdate.snapshot = {
        ...itemToUpdate.snapshot,
        customerPricingMethod,
      };
    }

    Object.assign(itemToUpdate, itemUpdates);
    await this.recalculatePricesForOrder(order);

    return this.ordersRepository.save(order);
  }

  async removeItemFromOrder(orderId: string, itemId: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: { items: { template: true }, orderGroup: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    const itemIndex = order.items.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) {
      throw new NotFoundException(
        `Order item with ID "${itemId}" not found in order "${orderId}"`,
      );
    }

    await this.orderItemsRepository.delete(itemId);

    order.items.splice(itemIndex, 1);
    order.items.forEach((item, index) => {
      item.position = index;
    });
    this.recalculateOrderTotal(order);

    return this.ordersRepository.save(order);
  }

  async reorderItems(orderId: string, itemIds: string[]): Promise<Order> {
    if (!Array.isArray(itemIds)) {
      throw new BadRequestException('itemIds must be an array');
    }

    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: { items: { template: true }, orderGroup: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    const currentIds = new Set(order.items.map(({ id }) => id));
    const containsAllItems =
      itemIds.length === currentIds.size &&
      itemIds.every((itemId) => currentIds.has(itemId));

    if (!containsAllItems) {
      throw new BadRequestException(
        'Item IDs must contain every item from the order exactly once',
      );
    }

    const positions = new Map(itemIds.map((itemId, index) => [itemId, index]));
    order.items.forEach((item) => {
      item.position = positions.get(item.id)!;
    });
    await this.orderItemsRepository.save(order.items);

    order.items.sort((a, b) => a.position - b.position);
    return order;
  }

  private async recalculatePricesForOrder(order: Order): Promise<void> {
    if (!order.items || order.items.length === 0) {
      order.totalPrice = 0;
      return;
    }

    const customerPrices = await this.pricingService.calculateCustomerPrices(
      order.items,
      order,
    );

    order.items.forEach((item, index) => {
      const productionCostPerUnit = this.pricingService.calculateProductionCost(
        item,
        item.template,
      );
      item.calculatedProductionCost = productionCostPerUnit * item.quantity;
      item.calculatedCustomerPrice = customerPrices[index];
    });

    this.recalculateOrderTotal(order);
  }

  private async createOrderItem(
    itemDto: CreateOrderItemDto,
    order: Order,
  ): Promise<OrderItem> {
    const template = await this.productsRepository.findOne({
      where: { id: itemDto.templateId },
      relations: { operations: true },
    });

    if (!template) {
      throw new BadRequestException(
        `Product template with ID "${itemDto.templateId}" not found.`,
      );
    }

    const orderItem = new OrderItem();
    orderItem.template = template;
    orderItem.quantity = itemDto.quantity;
    orderItem.characteristics = {
      ...template.defaultCharacteristics,
      ...itemDto.characteristics,
    };

    orderItem.snapshot = {
      name: template.name,
      baseCustomerPrice: template.baseCustomerPrice,
      attributes: template.attributes,
      customerPricingMethod: template.customerPricingMethod,
      defaultCharacteristics: template.defaultCharacteristics,
    };

    const productionCostPerUnit = this.pricingService.calculateProductionCost(
      orderItem,
      template,
    );
    orderItem.calculatedProductionCost =
      productionCostPerUnit * orderItem.quantity;

    orderItem.calculatedCustomerPrice =
      await this.pricingService.calculateCustomerPrice(orderItem, order);

    return orderItem;
  }

  private recalculateOrderTotal(order: Order): void {
    order.totalPrice = order.items.reduce(
      (sum, item) => sum + item.calculatedCustomerPrice,
      0,
    );
  }

  findAll(): Promise<Order[]> {
    return this.ordersRepository.find();
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.ordersRepository.findOneBy({ id });
    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }
    return order;
  }

  async findOneWithItems(id: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: { items: { template: true } },
      order: { items: { position: 'ASC' } },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }
    return order;
  }

  async recalculatePrices(id: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: {
        items: {
          template: true,
        },
        orderGroup: true,
      },
      order: { items: { position: 'ASC' } },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    await this.recalculatePricesForOrder(order);
    return this.ordersRepository.save(order);
  }

  async update(id: string, updateDto: UpdateOrderDto): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: {
        items: {
          template: true,
        },
        orderGroup: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    Object.assign(order, updateDto);

    await this.recalculatePricesForOrder(order);
    return this.ordersRepository.save(order);
  }

  async remove(id: string): Promise<Order> {
    const order = await this.findOne(id);
    await this.ordersRepository.remove(order);
    return order;
  }
}
