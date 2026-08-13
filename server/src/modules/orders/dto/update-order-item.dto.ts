import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsObject, IsOptional } from 'class-validator';
import { CustomerPricingMethod } from '../../products/entities/product-template.entity';
import { CreateOrderItemDto } from './create-order-item.dto';

export class UpdateOrderItemDto extends PartialType(CreateOrderItemDto) {
  @IsOptional()
  @IsEnum(CustomerPricingMethod)
  customerPricingMethod?: CustomerPricingMethod;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, string | number | boolean>;
}
