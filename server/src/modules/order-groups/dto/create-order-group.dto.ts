import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateOrderGroupDto {
  @IsString()
  @IsNotEmpty()
  orderNumber: string;

  @IsDate()
  @IsOptional()
  startedAt: Date;

  @IsOptional()
  @IsUUID()
  customerId?: string | null;

  @IsString()
  @IsOptional()
  comment?: string;
}
