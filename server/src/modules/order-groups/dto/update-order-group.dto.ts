import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateOrderGroupDto } from './create-order-group.dto';
import { OrderStatus } from '../entities/order-group.entity';

export class UpdateOrderGroupDto extends PartialType(CreateOrderGroupDto) {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;
}
