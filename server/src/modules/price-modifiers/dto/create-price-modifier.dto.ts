import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ModifierType } from '../entities/price-modifier.entity';

export class CreatePriceModifierDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ModifierType)
  type: ModifierType;

  @IsNumber()
  value: number;

  @IsObject()
  @IsNotEmpty()
  conditions: object;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  productTemplateIds?: string[];
}
