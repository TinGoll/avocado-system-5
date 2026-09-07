import { Check, Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { getDatabaseKind } from '../../database/database-kind';

export type CustomOrderStatusScope = 'group' | 'document';

@Entity('custom_order_statuses')
@Check('CHK_custom_order_statuses_scope', `"scope" IN ('group', 'document')`)
@Index('IDX_custom_order_statuses_scope_position', ['scope', 'position'])
export class CustomOrderStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  scope: CustomOrderStatusScope;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  color: string;

  @Column({ type: 'integer', default: 0 })
  position: number;

  @Column({
    type: getDatabaseKind() === 'postgres' ? 'timestamptz' : 'datetime',
    nullable: true,
  })
  archivedAt: Date | null;
}
