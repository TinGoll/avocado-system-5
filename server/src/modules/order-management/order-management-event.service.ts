import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  OrderManagementEvent,
  OrderManagementEventType,
  ManagementEventSnapshot,
  OrderManagementTargetSnapshot,
} from './entities/order-management-event.entity';

export interface WriteOrderManagementEvent {
  orderGroupId?: number | null;
  orderId?: string | null;
  type: OrderManagementEventType;
  before: ManagementEventSnapshot;
  after: ManagementEventSnapshot;
  targetSnapshot: OrderManagementTargetSnapshot;
  reason?: string | null;
}

@Injectable()
export class OrderManagementEventService {
  async record(
    manager: EntityManager,
    event: WriteOrderManagementEvent,
  ): Promise<OrderManagementEvent> {
    if (!manager.queryRunner?.isTransactionActive) {
      throw new Error('Order management events require an active transaction.');
    }
    return manager.save(
      OrderManagementEvent,
      manager.create(OrderManagementEvent, {
        ...event,
        orderGroupId: event.orderGroupId ?? null,
        orderId: event.orderId ?? null,
        reason: event.reason ?? null,
        notificationProcessedAt: null,
      }),
    );
  }
}
