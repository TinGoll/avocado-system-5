import {
  IsDate,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateOrderGroupDto {
  @IsString()
  @IsNotEmpty()
  orderNumber: string;

  @IsDate()
  @IsOptional()
  startedAt: Date;

  @IsObject()
  @IsOptional()
  customer?: object;
}
