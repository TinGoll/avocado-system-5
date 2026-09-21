import { Check, Column, Entity, PrimaryColumn } from 'typeorm';
import { OrderStatus } from '../../order-groups/entities/order-group.entity';

@Entity('order_management_settings')
@Check('CHK_order_management_settings_singleton', '"id" = 1')
export class OrderManagementSettings {
  @PrimaryColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'text', default: 'Europe/Moscow' })
  timeZone: string;

  @Column({ type: 'text', nullable: true })
  autoAddStatus: OrderStatus | null;

  @Column({ type: 'uuid', nullable: true })
  autoAddBoardId: string | null;

  @Column({ type: 'uuid', nullable: true })
  autoAddStageId: string | null;
}
