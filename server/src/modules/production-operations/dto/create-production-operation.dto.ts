import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { CalculationMethod } from '../entities/production-operation.entity';
import {
  PRODUCTION_OPERATION_FORMULA_MAX_LENGTH,
  PRODUCTION_OPERATION_TEMPLATE_MAX_LENGTH,
} from '../types/production-operation-formula-contract';

export class CreateProductionOperationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(CalculationMethod)
  calculationMethod: CalculationMethod;

  @IsString()
  @IsNotEmpty()
  @MaxLength(PRODUCTION_OPERATION_FORMULA_MAX_LENGTH)
  calculationFormula: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(PRODUCTION_OPERATION_TEMPLATE_MAX_LENGTH)
  displayNameTemplate: string;

  @IsNumber()
  @IsPositive()
  costPerUnit: number;
}
