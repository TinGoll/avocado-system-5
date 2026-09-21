import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  MoveCardDto,
  RemoveCardDto,
  TransferCardDto,
} from './dto/production-card.dto';
import { ProductionBoardsService } from './production-boards.service';

@Controller('production-cards')
export class ProductionCardsController {
  constructor(private readonly boards: ProductionBoardsService) {}

  @Post(':id/move')
  move(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MoveCardDto) {
    return this.boards.moveCard(id, dto);
  }

  @Post(':id/transfer')
  transfer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferCardDto,
  ) {
    return this.boards.transferCard(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RemoveCardDto) {
    return this.boards.removeCard(id, dto);
  }
}
