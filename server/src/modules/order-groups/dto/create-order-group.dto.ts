import { Type } from 'class-transformer';
import { IsArray, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { CreateOrderDto } from 'src/modules/orders/dto/create-order.dto';

export class CreateOrderGroupDto {
  @IsObject()
  @IsOptional()
  customer?: object;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderDto)
  orders: CreateOrderDto[];
}
