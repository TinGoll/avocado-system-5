import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ModifierType } from '../entities/price-modifier.entity';
import type { PriceModifierCondition } from '../types/price-modifier-condition.type';
import { IsPriceModifierConditionTree } from '../validators/is-price-modifier-condition-tree.validator';

export class CreatePriceModifierDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ModifierType)
  type: ModifierType;

  @IsNumber()
  value: number;

  @IsInt()
  priority: number;

  @IsPriceModifierConditionTree()
  conditions: PriceModifierCondition;

  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  productTemplateIds?: string[];
}
