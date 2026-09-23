import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { SafeBigintTransformer } from '../safe-bigint.transformer';
import { FinancialPaymentAllocation } from './financial-payment-allocation.entity';
import {
  FinanceCreateDateColumn,
  FinanceDateTimeColumn,
} from '../finance-datetime-column';

export enum FinancialPaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  OTHER = 'other',
}

export enum FinancialPaymentStatus {
  POSTED = 'posted',
  CANCELLED = 'cancelled',
}

@Entity('financial_payments')
@Check('CHK_financial_payments_amount', `"amountMinor" > 0`)
@Check(
  'CHK_financial_payments_method',
  `"method" IN ('cash', 'card', 'bank_transfer', 'other')`,
)
@Check('CHK_financial_payments_status', `"status" IN ('posted', 'cancelled')`)
@Index('IDX_financial_payments_customer_date', [
  'customerId',
  'paymentDate',
  'id',
])
@Index('IDX_financial_payments_date', ['paymentDate', 'id'])
@Index('IDX_financial_payments_method_date', ['method', 'paymentDate', 'id'])
@Index('UQ_financial_payments_request', ['requestId'], { unique: true })
@Index(
  'UQ_financial_payments_cancellation_request',
  ['cancellationRequestId'],
  {
    unique: true,
  },
)
export class FinancialPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'customerId',
    foreignKeyConstraintName: 'FK_financial_payments_customer',
  })
  customer: Customer;

  @Column({ type: 'bigint', transformer: new SafeBigintTransformer() })
  amountMinor: number;

  @Column({ type: 'date' })
  paymentDate: string;

  @Column({ type: 'text' })
  method: FinancialPaymentMethod;

  @Column({ type: 'text', nullable: true })
  externalReference: string | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'text', default: FinancialPaymentStatus.POSTED })
  status: FinancialPaymentStatus;

  @Column({ type: 'integer', default: 0 })
  version: number;

  @Column({ type: 'uuid' })
  requestId: string;

  @Column({ type: 'uuid', nullable: true })
  cancellationRequestId: string | null;

  @FinanceCreateDateColumn()
  createdAt: Date;

  @FinanceDateTimeColumn()
  cancelledAt: Date | null;

  @Column({ type: 'date', nullable: true })
  cancellationDate: string | null;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string | null;

  @OneToMany(
    () => FinancialPaymentAllocation,
    (allocation) => allocation.payment,
  )
  allocations: FinancialPaymentAllocation[];
}
