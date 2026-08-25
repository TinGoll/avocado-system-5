import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  PRODUCTION_OPERATION_FORMULA_MAX_LENGTH,
  PRODUCTION_OPERATION_TEMPLATE_MAX_LENGTH,
} from '../types/production-operation-formula-contract';

class PreviewItemDto {
  @IsString()
  @IsOptional()
  name?: string;

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

export class PreviewProductionOperationDto {
  @IsNumber()
  @IsPositive()
  costPerUnit: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(PRODUCTION_OPERATION_FORMULA_MAX_LENGTH)
  calculationFormula: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(PRODUCTION_OPERATION_TEMPLATE_MAX_LENGTH)
  displayNameTemplate: string;

  @ValidateNested()
  @Type(() => PreviewItemDto)
  item: PreviewItemDto;

  @IsObject()
  @IsOptional()
  orderCharacteristics?: Record<string, unknown>;
}
