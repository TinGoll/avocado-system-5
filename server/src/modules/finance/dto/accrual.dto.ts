import {
  IsDateString,
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

const MONEY_PATTERN = /^-?(0|[1-9]\d*)(?:\.\d{1,2})?$/;

export class CreateOrderAccrualDto {
  @IsInt()
  @Min(1)
  orderGroupId: number;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  effectiveDate: string;

  @IsUUID()
  requestId: string;
}

export class CreateManualAccrualDto {
  @IsUUID()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(500)
  title: string;

  @Matches(MONEY_PATTERN)
  amount: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  effectiveDate: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  reason?: string;

  @IsUUID()
  requestId: string;
}

export class VersionedAccrualCommandDto {
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER - 1)
  expectedVersion: number;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  effectiveDate: string;

  @IsUUID()
  requestId: string;
}

export class SyncOrderAccrualDto extends VersionedAccrualCommandDto {}

export class AdjustAccrualDto extends VersionedAccrualCommandDto {
  @Matches(MONEY_PATTERN)
  amount: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(1000)
  reason: string;
}

export class CancelAccrualDto extends VersionedAccrualCommandDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(1000)
  reason: string;
}
