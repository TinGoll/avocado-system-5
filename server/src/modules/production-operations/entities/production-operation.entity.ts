import { ColumnNumericTransformer } from 'src/shared/utils/column.transformer';
import {
  PRODUCTION_OPERATION_FORMULA_MAX_LENGTH,
  PRODUCTION_OPERATION_TEMPLATE_MAX_LENGTH,
} from '../types/production-operation-formula-contract';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CalculationMethod {
  PER_ITEM = 'per_item', // Поштучно
  LINEAR_METER = 'linear_meter', // По погонным метрам (м)
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
    type: 'simple-enum',
    enum: CalculationMethod,
    enumName: 'production_operations_calculationmethod_enum',
    default: CalculationMethod.PER_ITEM,
  })
  calculationMethod: CalculationMethod;

  @Column({ type: 'varchar', length: PRODUCTION_OPERATION_FORMULA_MAX_LENGTH })
  calculationFormula: string;

  @Column({ type: 'varchar', length: PRODUCTION_OPERATION_TEMPLATE_MAX_LENGTH })
  displayNameTemplate: string;

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
