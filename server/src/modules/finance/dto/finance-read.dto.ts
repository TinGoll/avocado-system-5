import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsIn,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { FinancialAccrualSourceType } from '../entities/financial-accrual.entity';
import {
  FinancialPaymentMethod,
  FinancialPaymentStatus,
} from '../entities/financial-payment.entity';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export enum AccrualPaymentState {
  UNPAID = 'unpaid',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export enum PaymentAllocationState {
  UNALLOCATED = 'unallocated',
  PARTIAL = 'partial',
  ALLOCATED = 'allocated',
}

export enum FinanceTurnoverReportType {
  ACCRUALS = 'accruals',
  PAYMENTS = 'payments',
}

export class FinanceListQueryDto {
  @IsOptional()
  @Matches(DATE_PATTERN)
  dateFrom?: string;

  @IsOptional()
  @Matches(DATE_PATTERN)
  dateTo?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}

export class AccrualListQueryDto extends FinanceListQueryDto {
  @IsOptional()
  @IsEnum(FinancialAccrualSourceType)
  sourceType?: FinancialAccrualSourceType;

  @IsOptional()
  @IsEnum(AccrualPaymentState)
  status?: AccrualPaymentState;
}

export class PaymentListQueryDto extends FinanceListQueryDto {
  @IsOptional()
  @IsEnum(FinancialPaymentMethod)
  method?: FinancialPaymentMethod;

  @IsOptional()
  @IsEnum(FinancialPaymentStatus)
  status?: FinancialPaymentStatus;

  @IsOptional()
  @IsEnum(PaymentAllocationState)
  allocationState?: PaymentAllocationState;
}

export class TurnoverReportQueryDto extends FinanceListQueryDto {
  @IsEnum(FinanceTurnoverReportType)
  reportType: FinanceTurnoverReportType;

  @IsOptional()
  @IsEnum(FinancialAccrualSourceType)
  sourceType?: FinancialAccrualSourceType;

  @IsOptional()
  @IsEnum(FinancialPaymentMethod)
  method?: FinancialPaymentMethod;

  @IsOptional()
  @IsIn(['active', 'cancelled', 'posted'])
  status?: string;

  @IsOptional()
  @IsEnum(PaymentAllocationState)
  allocationState?: PaymentAllocationState;
}

export class CustomerStatementQueryDto extends FinanceListQueryDto {}

export enum CustomerFinanceHistoryType {
  PAYMENT = 'payment',
  ALLOCATION = 'allocation',
  PAYMENT_CANCELLATION = 'payment_cancellation',
  ALLOCATION_RELEASE = 'allocation_release',
  ADJUSTMENT = 'adjustment',
  REVERSAL = 'reversal',
}

export class CustomerFinanceHistoryQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    const values: unknown[] = Array.isArray(value) ? value : [value];
    return values.flatMap((item): unknown[] =>
      typeof item === 'string' ? item.split(',').filter(Boolean) : [item],
    );
  })
  @IsArray()
  @IsEnum(CustomerFinanceHistoryType, { each: true })
  types?: CustomerFinanceHistoryType[];

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;
}
