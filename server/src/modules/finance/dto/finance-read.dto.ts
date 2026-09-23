import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
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
