import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { OrderGroupsService } from './order-groups.service';
import { CreateOrderGroupDto } from './dto/create-order-group.dto';
import { UpdateOrderGroupDto } from './dto/update-order-group.dto';
import { SearchOrderGroupsDto } from './dto/search-order-groups.dto';

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

  @Get('search')
  search(@Query() query: SearchOrderGroupsDto) {
    return this.orderGroupsService.search(query.q, query.limit);
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

  @Get(':id/order-ids')
  findOrderIds(@Param('id') id: string) {
    return this.orderGroupsService.findOrderIds(+id);
  }

  @Get(':id/with-order-ids')
  findOneWithOrderIds(@Param('id') id: string) {
    return this.orderGroupsService.findOneWithOrderIds(+id);
  }
}
