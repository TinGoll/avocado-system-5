import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { getDatabaseKind } from '../../database/database-kind';
import { ProductionBoard } from './production-board.entity';

export type ProductionStageKind = 'queue' | 'active' | 'done';

@Entity('production_stages')
@Index('IDX_production_stages_board_position', ['boardId', 'position'])
@Check(
  'CHK_production_stages_progress',
  `("kind" = 'queue' AND "progressPercent" = 0) OR ("kind" = 'active' AND "progressPercent" BETWEEN 1 AND 99) OR ("kind" = 'done' AND "progressPercent" = 100)`,
)
export class ProductionStage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  boardId: string;

  @ManyToOne(() => ProductionBoard, (board) => board.stages, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'boardId',
    foreignKeyConstraintName: 'FK_production_stages_board',
  })
  board: ProductionBoard;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  color: string;

  @Column({ type: 'text' })
  kind: ProductionStageKind;

  @Column({ type: 'integer' })
  progressPercent: number;

  @Column({ type: 'integer', default: 0 })
  position: number;

  @Column({
    type: getDatabaseKind() === 'postgres' ? 'timestamptz' : 'datetime',
    nullable: true,
  })
  usedAt: Date | null;

  @Column({
    type: getDatabaseKind() === 'postgres' ? 'timestamptz' : 'datetime',
    nullable: true,
  })
  archivedAt: Date | null;
}
