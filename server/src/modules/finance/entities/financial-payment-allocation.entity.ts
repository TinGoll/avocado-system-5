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
import { FinancialPayment } from './financial-payment.entity';
import {
  FinanceCreateDateColumn,
  FinanceDateTimeColumn,
} from '../finance-datetime-column';

export enum FinancialPaymentAllocationStatus {
  ACTIVE = 'active',
  RELEASED = 'released',
}

@Entity('financial_payment_allocations')
@Check('CHK_financial_payment_allocations_amount', `"amountMinor" > 0`)
@Check(
  'CHK_financial_payment_allocations_status',
  `"status" IN ('active', 'released')`,
)
@Index('IDX_financial_payment_allocations_payment_status', [
  'paymentId',
  'status',
])
@Index('IDX_financial_payment_allocations_accrual_status', [
  'accrualId',
  'status',
])
export class FinancialPaymentAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  paymentId: string;

  @ManyToOne(() => FinancialPayment, (payment) => payment.allocations, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'paymentId',
    foreignKeyConstraintName: 'FK_financial_payment_allocations_payment',
  })
  payment: FinancialPayment;

  @Column({ type: 'uuid' })
  accrualId: string;

  @ManyToOne(() => FinancialAccrual, (accrual) => accrual.allocations, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'accrualId',
    foreignKeyConstraintName: 'FK_financial_payment_allocations_accrual',
  })
  accrual: FinancialAccrual;

  @Column({ type: 'bigint', transformer: new SafeBigintTransformer() })
  amountMinor: number;

  @Column({ type: 'text', default: FinancialPaymentAllocationStatus.ACTIVE })
  status: FinancialPaymentAllocationStatus;

  @FinanceCreateDateColumn()
  createdAt: Date;

  @FinanceDateTimeColumn()
  releasedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  releaseReason: string | null;
}
