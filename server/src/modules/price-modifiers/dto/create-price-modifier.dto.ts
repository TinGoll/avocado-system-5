import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { ModifierType } from '../entities/price-modifier.entity';
import { Type } from 'class-transformer';
import { ConditionDto } from './condition.dto';
import type { PriceModifierCondition } from '../types/price-modifier-condition.type';

export class CreatePriceModifierDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ModifierType)
  type: ModifierType;

  @IsNumber()
  value: number;

  @ValidateNested()
  @Type(() => ConditionDto)
  conditions: PriceModifierCondition;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  productTemplateIds?: string[];
}
