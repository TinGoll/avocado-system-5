import { IsDefined, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import {
  ConditionOperator,
  ConditionSource,
} from '../entities/price-modifier.entity';

export class ConditionDto {
  @IsEnum(ConditionSource)
  source: ConditionSource;

  @IsString()
  @IsNotEmpty()
  path: string;

  @IsEnum(ConditionOperator)
  operator: ConditionOperator;

  @IsDefined()
  value: unknown;
}
