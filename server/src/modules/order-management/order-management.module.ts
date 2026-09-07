import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomOrderStatus } from './entities/custom-order-status.entity';
import { OrderManagementSettings } from './entities/order-management-settings.entity';
import { OrderManagementEvent } from './entities/order-management-event.entity';
import { OrderManagementEventService } from './order-management-event.service';
import { OrderManagementService } from './order-management.service';
import {
  OrderManagementController,
  OrderGroupManagementController,
  OrderDocumentManagementController,
} from './order-management.controller';
import { OrderGroup } from '../order-groups/entities/order-group.entity';
import { Order } from '../orders/entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomOrderStatus,
      OrderManagementSettings,
      OrderManagementEvent,
      OrderGroup,
      Order,
    ]),
  ],
  controllers: [
    OrderManagementController,
    OrderGroupManagementController,
    OrderDocumentManagementController,
  ],
  providers: [OrderManagementEventService, OrderManagementService],
  exports: [OrderManagementEventService, OrderManagementService],
})
export class OrderManagementModule {}
