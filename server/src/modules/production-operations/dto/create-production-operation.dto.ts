import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';
import { CalculationMethod } from '../entities/production-operation.entity';

export class CreateProductionOperationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(CalculationMethod)
  calculationMethod: CalculationMethod;

  @IsNumber()
  @IsPositive()
  costPerUnit: number;
}
