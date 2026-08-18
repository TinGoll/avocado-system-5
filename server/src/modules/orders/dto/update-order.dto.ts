import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class UpdateOrderDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsObject()
  @IsOptional()
  characteristics?: object;

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;
}
