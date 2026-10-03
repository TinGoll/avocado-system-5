import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const MONEY_PATTERN = /^(0|[1-9]\d*)(?:\.\d{1,2})?$/;

export class AllocationBatchItemDto {
  @ValidateIf((item: AllocationBatchItemDto) => item.orderGroupId === undefined)
  @IsUUID()
  accrualId?: string;

  @ValidateIf((item: AllocationBatchItemDto) => item.accrualId === undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderGroupId?: number;

  @Matches(MONEY_PATTERN)
  amount: string;
}

export class CreateAllocationBatchDto {
  @IsUUID()
  customerId: string;

  @IsUUID()
  requestId: string;

  @Matches(/^[a-f0-9]{64}$/)
  expectedRevision: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AllocationBatchItemDto)
  allocations: AllocationBatchItemDto[];
}
