import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { DatabaseJsonColumn } from '../../database/database-json-column';
import { FinanceCreateDateColumn } from '../finance-datetime-column';
import { SafeBigintTransformer } from '../safe-bigint.transformer';
import { FinancialPaymentAllocation } from './financial-payment-allocation.entity';

export type FinancialAllocationBatchRequestSnapshot = {
  comment: string | null;
  allocations: Array<{
    accrualId: string;
    orderGroupId: number;
    amountMinor: number;
  }>;
};

export type FinancialAllocationBatchResultSnapshot = Array<{
  accrualId: string;
  orderGroupId: number;
  orderNumber: string;
  allocatedMinor: number;
  newDebtMinor: number;
}>;

@Entity('financial_allocation_batches')
@Index('UQ_financial_allocation_batches_request', ['requestId'], {
  unique: true,
})
@Index('IDX_financial_allocation_batches_customer_created', [
  'customerId',
  'createdAt',
  'id',
])
export class FinancialAllocationBatch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'customerId',
    foreignKeyConstraintName: 'FK_financial_allocation_batches_customer',
  })
  customer: Customer;

  @Column({ type: 'uuid' })
  requestId: string;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'text', nullable: true })
  authorName: string | null;

  @Column({ type: 'bigint', transformer: new SafeBigintTransformer() })
  totalMinor: number;

  @Column({ type: 'bigint', transformer: new SafeBigintTransformer() })
  balanceAfterMinor: number;

  @DatabaseJsonColumn()
  requestSnapshot: FinancialAllocationBatchRequestSnapshot;

  @DatabaseJsonColumn()
  resultSnapshot: FinancialAllocationBatchResultSnapshot;

  @FinanceCreateDateColumn()
  createdAt: Date;

  @OneToMany(() => FinancialPaymentAllocation, (allocation) => allocation.batch)
  allocations: FinancialPaymentAllocation[];
}
