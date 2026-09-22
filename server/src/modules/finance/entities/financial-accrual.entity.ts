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
import { OrderGroup } from '../../order-groups/entities/order-group.entity';
import { FinancialAccrualEntry } from './financial-accrual-entry.entity';
import { FinancialPaymentAllocation } from './financial-payment-allocation.entity';
import {
  FinanceCreateDateColumn,
  FinanceDateTimeColumn,
} from '../finance-datetime-column';

export enum FinancialAccrualSourceType {
  ORDER = 'order',
  MANUAL = 'manual',
}

export enum FinancialAccrualStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
}

@Entity('financial_accruals')
@Check(
  'CHK_financial_accruals_source_order',
  `("sourceType" = 'order' AND "orderGroupId" IS NOT NULL) OR ("sourceType" = 'manual' AND "orderGroupId" IS NULL)`,
)
@Check(
  'CHK_financial_accruals_source_type',
  `"sourceType" IN ('order', 'manual')`,
)
@Check('CHK_financial_accruals_status', `"status" IN ('active', 'cancelled')`)
@Index('IDX_financial_accruals_customer_status_created', [
  'customerId',
  'status',
  'createdAt',
  'id',
])
@Index('UQ_financial_accruals_order_group', ['orderGroupId'], { unique: true })
export class FinancialAccrual {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'customerId',
    foreignKeyConstraintName: 'FK_financial_accruals_customer',
  })
  customer: Customer;

  @Column({ type: 'text' })
  sourceType: FinancialAccrualSourceType;

  @Column({ type: 'integer', nullable: true })
  orderGroupId: number | null;

  @ManyToOne(() => OrderGroup, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'orderGroupId',
    foreignKeyConstraintName: 'FK_financial_accruals_order_group',
  })
  orderGroup: OrderGroup | null;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', default: FinancialAccrualStatus.ACTIVE })
  status: FinancialAccrualStatus;

  @Column({ type: 'integer', default: 0 })
  version: number;

  @FinanceCreateDateColumn()
  createdAt: Date;

  @FinanceDateTimeColumn()
  cancelledAt: Date | null;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string | null;

  @OneToMany(() => FinancialAccrualEntry, (entry) => entry.accrual)
  entries: FinancialAccrualEntry[];

  @OneToMany(
    () => FinancialPaymentAllocation,
    (allocation) => allocation.accrual,
  )
  allocations: FinancialPaymentAllocation[];
}
