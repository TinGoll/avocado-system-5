import { Check, Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('order_management_settings')
@Check('CHK_order_management_settings_singleton', '"id" = 1')
export class OrderManagementSettings {
  @PrimaryColumn({ type: 'integer' })
  id: number;

  @Column({ type: 'text', default: 'Europe/Moscow' })
  timeZone: string;
}
