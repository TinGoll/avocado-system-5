import { ColumnNumericTransformer } from 'src/shared/utils/column.transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CalculationMethod {
  PER_ITEM = 'per_item', // Поштучно
  AREA = 'area', // По квадратуре (м²)
  VOLUME = 'volume', // По кубатуре (м³)
}

@Entity('production_operations')
export class ProductionOperation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text', unique: true })
  name: string;

  @Column({
    type: 'enum',
    enum: CalculationMethod,
    default: CalculationMethod.PER_ITEM,
  })
  calculationMethod: CalculationMethod;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: new ColumnNumericTransformer(),
  })
  costPerUnit: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
