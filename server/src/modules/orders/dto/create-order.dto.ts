import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateOrderItemDto {
  @IsInt()
  productId: number;

  @IsInt()
  quantity: number;

  @IsArray()
  @IsInt({ each: true })
  optionIds: number[];

  @IsObject()
  dimensions: Record<string, any>;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  customer: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
