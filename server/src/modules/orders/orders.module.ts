import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { ProductTemplate } from '../products/entities/product-template.entity';
import { PricingModule } from '../pricing/pricing.module';
import { OrderGroup } from '../order-groups/entities/order-group.entity';

@Module({
  imports: [
    PricingModule,
    TypeOrmModule.forFeature([Order, OrderItem, ProductTemplate, OrderGroup]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
