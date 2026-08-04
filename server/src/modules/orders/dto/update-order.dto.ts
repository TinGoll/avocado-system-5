import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class UpdateOrderDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;
}
