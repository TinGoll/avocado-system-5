import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { OrderGroupsService } from './order-groups.service';
import { CreateOrderGroupDto } from './dto/create-order-group.dto';
import { UpdateOrderGroupDto } from './dto/update-order-group.dto';

@Controller('order-groups')
export class OrderGroupsController {
  constructor(private readonly orderGroupsService: OrderGroupsService) {}

  @Post()
  create(@Body() createOrderGroupDto: CreateOrderGroupDto) {
    return this.orderGroupsService.create(createOrderGroupDto);
  }

  @Get()
  findAll() {
    return this.orderGroupsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderGroupsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateOrderGroupDto: UpdateOrderGroupDto,
  ) {
    return this.orderGroupsService.update(+id, updateOrderGroupDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderGroupsService.remove(+id);
  }
}
