import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { OptionValue } from '../options/entities/option.entity';
import { PriceCalculationModule } from '../price-calculation/price-calculation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product, OptionValue]),
    PriceCalculationModule,
  ],
  providers: [OrdersService],
})
export class OrdersModule {}
