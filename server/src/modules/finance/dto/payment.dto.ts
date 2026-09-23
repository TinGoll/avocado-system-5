import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { FinancialPaymentMethod } from '../entities/financial-payment.entity';

const MONEY_PATTERN = /^(?!0(?:\.0{1,2})?$)(0|[1-9]\d*)(?:\.\d{1,2})?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreatePaymentDto {
  @IsUUID()
  customerId: string;

  @Matches(MONEY_PATTERN)
  amount: string;

  @IsDateString({ strict: true })
  @Matches(DATE_PATTERN)
  paymentDate: string;

  @IsEnum(FinancialPaymentMethod)
  method: FinancialPaymentMethod;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  externalReference?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  comment?: string;

  @IsUUID()
  requestId: string;
}

export class CancelPaymentDto {
  @IsDateString({ strict: true })
  @Matches(DATE_PATTERN)
  cancellationDate: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(1000)
  reason: string;

  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER - 1)
  expectedVersion: number;

  @IsUUID()
  requestId: string;
}
