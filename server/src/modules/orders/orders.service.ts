import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Product } from 'src/modules/products/entities/product.entity';
import { OptionValue } from 'src/modules/options/entities/option.entity';
import { In, Repository } from 'typeorm';
import { PriceCalculationService } from '../price-calculation/price-calculation.service';
import { OrderItem } from './entities/order-item.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(OptionValue)
    private readonly optionRepository: Repository<OptionValue>,
    private readonly priceCalculationService: PriceCalculationService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const order = new Order();
    order.customer = createOrderDto.customer;
    order.orderNumber = `ORD-${Date.now()}-${Math.round(Math.random() * 1000)}`; // Простая генерация номера

    let totalAmount = 0;

    // Параллельно обрабатываем все позиции заказа
    const orderItemsPromises = createOrderDto.items.map(async (itemDto) => {
      // 1. Получаем актуальные данные о продукте и опциях
      const product = await this.productRepository.findOneBy({
        id: itemDto.productId,
      });
      if (!product)
        throw new NotFoundException(
          `Продукт с ID ${itemDto.productId} не найден.`,
        );

      const options = await this.optionRepository.find({
        where: { id: In(itemDto.optionIds) },
        relations: ['group'],
      });

      // 2. Рассчитываем цену через специализированный сервис
      const { basePrice, finalPrice } =
        await this.priceCalculationService.calculatePrice(
          itemDto.productId,
          itemDto.optionIds,
        );

      // 3. Создаем "запеченную" позицию заказа (OrderItem)
      const orderItem = new OrderItem();
      orderItem.originalProductId = product.id;
      orderItem.quantity = itemDto.quantity;
      orderItem.dimensions = itemDto.dimensions;

      // 4. "Запекаем" цены
      orderItem.basePrice = basePrice;
      orderItem.unitPrice = finalPrice;
      orderItem.totalPrice = finalPrice * itemDto.quantity;

      // 5. "Запекаем" названия в JSONB для исторической точности
      orderItem.productSnapshot = { name: product.name };
      orderItem.optionsSnapshot = options.map((opt) => ({
        group: opt.group.name,
        option: opt.name,
      }));

      // 6. Увеличиваем общую сумму заказа
      totalAmount += orderItem.totalPrice;

      return orderItem;
    });

    order.items = await Promise.all(orderItemsPromises);
    order.totalAmount = totalAmount;

    // 7. Сохраняем заказ вместе со всеми позициями благодаря cascade: true
    return this.orderRepository.save(order);
  }
}
