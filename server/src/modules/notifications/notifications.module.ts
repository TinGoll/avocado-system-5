import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderManagementEvent } from '../order-management/entities/order-management-event.entity';
import { OrderManagementSettings } from '../order-management/entities/order-management-settings.entity';
import { CustomOrderStatus } from '../order-management/entities/custom-order-status.entity';
import { OrderGroup } from '../order-groups/entities/order-group.entity';
import { Order } from '../orders/entities/order.entity';
import { ProductionBoard } from '../production-boards/entities/production-board.entity';
import { ProductionCard } from '../production-boards/entities/production-card.entity';
import { ProductionStage } from '../production-boards/entities/production-stage.entity';
import { NotificationRule } from './entities/notification-rule.entity';
import { Notification } from './entities/notification.entity';
import {
  NotificationFeedController,
  NotificationsController,
} from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationSchedulerService } from './notification-scheduler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationRule,
      Notification,
      CustomOrderStatus,
      OrderManagementEvent,
      OrderManagementSettings,
      OrderGroup,
      Order,
      ProductionBoard,
      ProductionCard,
      ProductionStage,
    ]),
  ],
  controllers: [NotificationsController, NotificationFeedController],
  providers: [NotificationsService, NotificationSchedulerService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
