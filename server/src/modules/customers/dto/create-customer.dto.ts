import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { CustomerLevel } from '../entities/customer.entity';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(CustomerLevel)
  level: CustomerLevel;
}
