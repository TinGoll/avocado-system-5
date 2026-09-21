import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ProductionBoardsService } from './production-boards.service';

@Controller('order-groups')
export class OrderGroupProductionController {
  constructor(private readonly boards: ProductionBoardsService) {}

  @Get(':id/production')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.boards.groupProduction(id);
  }
}
