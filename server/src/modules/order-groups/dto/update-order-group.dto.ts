import { PartialType } from '@nestjs/mapped-types';
import {
  IsEnum,
  IsInt,
  IsBoolean,
  IsString,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { RawValue, Trim } from '../../order-management/dto/management.dto';
import { CreateOrderGroupDto } from './create-order-group.dto';
import { OrderStatus } from '../entities/order-group.entity';

export class UpdateOrderGroupDto extends PartialType(CreateOrderGroupDto) {
  @IsEnum(OrderStatus)
  @ValidateIf((_, value: unknown) => value !== undefined)
  status?: OrderStatus;

  @RawValue()
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER - 1)
  expectedVersion?: number;

  @RawValue()
  @Trim()
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason?: string;

  @RawValue()
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsBoolean()
  confirmIncompleteProduction?: boolean;
}
