import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @IsObject()
  @IsOptional()
  characteristics?: object;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(0)
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsInt()
  @IsPositive()
  @IsOptional()
  orderGroupId?: number;
}
