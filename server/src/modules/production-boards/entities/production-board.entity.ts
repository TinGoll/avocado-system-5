import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { getDatabaseKind } from '../../database/database-kind';
import { ProductionStage } from './production-stage.entity';

@Entity('production_boards')
export class ProductionBoard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Nullable only while a board and its stages are created in one transaction.
  @Column({ type: 'uuid', nullable: true })
  initialStageId: string | null;

  @ManyToOne(() => ProductionStage, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'initialStageId',
    foreignKeyConstraintName: 'FK_production_boards_initial_stage',
  })
  initialStage: ProductionStage | null;

  @OneToMany(() => ProductionStage, (stage) => stage.board)
  stages: ProductionStage[];

  @Column({ type: 'integer', default: 0 })
  version: number;

  @Column({
    type: getDatabaseKind() === 'postgres' ? 'timestamptz' : 'datetime',
    nullable: true,
  })
  archivedAt: Date | null;
}
