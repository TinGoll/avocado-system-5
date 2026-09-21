import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { getDatabaseKind } from '../../database/database-kind';
import { Order } from '../../orders/entities/order.entity';
import { ProductionStage } from './production-stage.entity';

@Entity('production_cards')
@Index('UQ_production_cards_order', ['orderId'], { unique: true })
@Index('IDX_production_cards_stage_position_id', ['stageId', 'position', 'id'])
export class ProductionCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'orderId',
    foreignKeyConstraintName: 'FK_production_cards_order',
  })
  order: Order;

  @Column({ type: 'uuid' })
  stageId: string;

  @ManyToOne(() => ProductionStage, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'stageId',
    foreignKeyConstraintName: 'FK_production_cards_stage',
  })
  stage: ProductionStage;

  @Column({ type: 'integer' })
  position: number;

  @Column({ type: 'integer' })
  progressPercent: number;

  @Column({
    type: getDatabaseKind() === 'postgres' ? 'timestamptz' : 'datetime',
  })
  enteredStageAt: Date;

  @Column({ type: 'integer', default: 0 })
  version: number;
}
