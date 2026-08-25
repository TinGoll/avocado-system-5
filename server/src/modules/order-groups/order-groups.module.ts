import { Module } from '@nestjs/common';
import { OrderGroupsService } from './order-groups.service';
import { OrderGroupsController } from './order-groups.controller';
import { OrderGroup } from './entities/order-group.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { PricingModule } from '../pricing/pricing.module';
import { ProductTemplate } from '../products/entities/product-template.entity';

@Module({
  imports: [
    PricingModule,
    TypeOrmModule.forFeature([OrderGroup, Order, OrderItem, ProductTemplate]),
  ],
  controllers: [OrderGroupsController],
  providers: [OrderGroupsService],
})
export class OrderGroupsModule {}
