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
      items.map((itemDto) => this.createOrderItem(itemDto, order)),
    );

    this.recalculateOrderTotal(order);

    return this.ordersRepository.save(order);
  }

  async addItemToOrder(
    orderId: string,
    createItemDto: CreateOrderItemDto,
  ): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: { items: true, orderGroup: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    const newOrderItem = await this.createOrderItem(createItemDto, order);
    order.items.push(newOrderItem);
    this.recalculateOrderTotal(order);

    return this.ordersRepository.save(order);
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

  async update(id: string, updateDto: UpdateOrderDto): Promise<Order> {
    const order = await this.ordersRepository.preload({
      id,
      ...updateDto,
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }
    return this.ordersRepository.save(order);
  }

  async remove(id: string): Promise<Order> {
    const order = await this.findOne(id);
    await this.ordersRepository.remove(order);
    return order;
  }
}
