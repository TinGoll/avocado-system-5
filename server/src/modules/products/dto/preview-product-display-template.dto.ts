import { Type } from 'class-transformer';
import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PRODUCT_DISPLAY_TEMPLATE_MAX_LENGTH } from '../entities/product-template.entity';

class PreviewProductItemDto {
  @IsString()
  name: string;

  @IsNumber()
  @IsOptional()
  width?: number;

  @IsNumber()
  @IsOptional()
  height?: number;

  @IsNumber()
  @IsOptional()
  thickness?: number;

  @IsNumber()
  quantity: number;
}

export class PreviewProductDisplayTemplateDto {
  @IsString()
  @MaxLength(PRODUCT_DISPLAY_TEMPLATE_MAX_LENGTH)
  displayTemplate: string;

  @ValidateNested()
  @Type(() => PreviewProductItemDto)
  item: PreviewProductItemDto;

  @IsObject()
  @IsOptional()
  orderCharacteristics?: object;
}
