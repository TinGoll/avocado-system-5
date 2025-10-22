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

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(ProductTemplate)
    private readonly productsRepository: Repository<ProductTemplate>,
    private readonly pricingService: PricingService,
  ) {}

  async create(createDto: CreateOrderDto): Promise<Order> {
    const { items, ...orderData } = createDto;

    const order = this.ordersRepository.create(orderData);
    const orderItems: OrderItem[] = [];

    order.items = orderItems;

    for (const itemDto of items) {
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

      orderItems.push(orderItem);
    }

    return this.ordersRepository.save(order);
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
