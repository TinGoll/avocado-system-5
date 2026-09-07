import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomOrderStatus } from './entities/custom-order-status.entity';
import { OrderManagementSettings } from './entities/order-management-settings.entity';
import { OrderManagementEvent } from './entities/order-management-event.entity';
import { OrderManagementEventService } from './order-management-event.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomOrderStatus,
      OrderManagementSettings,
      OrderManagementEvent,
    ]),
  ],
  providers: [OrderManagementEventService],
  exports: [OrderManagementEventService],
})
export class OrderManagementModule {}
