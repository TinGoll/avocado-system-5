import { Module } from '@nestjs/common';
import { OrderGroupsService } from './order-groups.service';
import { OrderGroupsController } from './order-groups.controller';
import { OrderGroup } from './entities/order-group.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { PricingModule } from '../pricing/pricing.module';
import { ProductTemplate } from '../products/entities/product-template.entity';
import { OrderManagementModule } from '../order-management/order-management.module';
import { Customer } from '../customers/entities/customer.entity';
import { FinancialAccrual } from '../finance/entities/financial-accrual.entity';

@Module({
  imports: [
    OrderManagementModule,
    PricingModule,
    TypeOrmModule.forFeature([
      OrderGroup,
      Order,
      OrderItem,
      ProductTemplate,
      Customer,
      FinancialAccrual,
    ]),
  ],
  controllers: [OrderGroupsController],
  providers: [OrderGroupsService],
})
export class OrderGroupsModule {}
