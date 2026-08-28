import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  IsUUID,
} from 'class-validator';
import {
  CustomerPricingMethod,
  PRODUCT_DISPLAY_TEMPLATE_MAX_LENGTH,
} from '../entities/product-template.entity';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(PRODUCT_DISPLAY_TEMPLATE_MAX_LENGTH)
  displayTemplate?: string | null;

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

  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @IsOptional()
  priceModifierIds?: string[];
}
