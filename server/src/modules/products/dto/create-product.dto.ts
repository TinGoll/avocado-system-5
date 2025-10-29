import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { CustomerPricingMethod } from '../entities/product-template.entity';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  group?: string;

  @IsObject()
  @IsOptional()
  defaultCharacteristics?: Record<string, string | number | boolean>;

  @IsEnum(CustomerPricingMethod)
  @IsOptional()
  customerPricingMethod?: CustomerPricingMethod;

  @IsNumber()
  @IsPositive()
  baseCustomerPrice: number;

  @IsObject()
  @IsOptional()
  attributes?: object;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  operationIds?: string[];
}
