import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SafeBigintTransformer } from '../safe-bigint.transformer';
import { FinancialAccrual } from './financial-accrual.entity';
import { FinanceCreateDateColumn } from '../finance-datetime-column';

export enum FinancialAccrualEntryKind {
  INITIAL = 'initial',
  ADJUSTMENT = 'adjustment',
  REVERSAL = 'reversal',
}

@Entity('financial_accrual_entries')
@Check('CHK_financial_accrual_entries_amount', `"amountMinor" <> 0`)
@Check(
  'CHK_financial_accrual_entries_initial_amount',
  `"kind" <> 'initial' OR "amountMinor" > 0`,
)
@Check(
  'CHK_financial_accrual_entries_kind',
  `"kind" IN ('initial', 'adjustment', 'reversal')`,
)
@Index('IDX_financial_accrual_entries_accrual_effective', [
  'accrualId',
  'effectiveDate',
  'id',
])
@Index('IDX_financial_accrual_entries_effective', ['effectiveDate', 'id'])
@Index('UQ_financial_accrual_entries_request', ['requestId'], { unique: true })
@Index('UQ_financial_accrual_entries_reverses', ['reversesEntryId'], {
  unique: true,
})
export class FinancialAccrualEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  accrualId: string;

  @ManyToOne(() => FinancialAccrual, (accrual) => accrual.entries, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'accrualId',
    foreignKeyConstraintName: 'FK_financial_accrual_entries_accrual',
  })
  accrual: FinancialAccrual;

  @Column({ type: 'text' })
  kind: FinancialAccrualEntryKind;

  @Column({ type: 'bigint', transformer: new SafeBigintTransformer() })
  amountMinor: number;

  @Column({ type: 'date' })
  effectiveDate: string;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'uuid', nullable: true })
  reversesEntryId: string | null;

  @ManyToOne(() => FinancialAccrualEntry, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'reversesEntryId',
    foreignKeyConstraintName: 'FK_financial_accrual_entries_reverses',
  })
  reversesEntry: FinancialAccrualEntry | null;

  @Column({ type: 'uuid' })
  requestId: string;

  @FinanceCreateDateColumn()
  createdAt: Date;
}
