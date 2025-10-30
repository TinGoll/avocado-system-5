import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderGroupDto } from './create-order-group.dto';

export class UpdateOrderGroupDto extends PartialType(CreateOrderGroupDto) {}
