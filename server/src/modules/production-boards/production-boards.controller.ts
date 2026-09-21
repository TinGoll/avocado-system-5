import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ProductionBoardsService } from './production-boards.service';
import {
  BoardVersionDto,
  CreateBoardDto,
  CreateStageDto,
  RemoveStageDto,
  ReorderStagesDto,
  UpdateBoardDto,
  UpdateStageDto,
} from './dto/production-board.dto';
import { AssignCardDto, CardsQueryDto } from './dto/production-card.dto';

@Controller('production-boards')
export class ProductionBoardsController {
  constructor(private readonly boards: ProductionBoardsService) {}

  @Get()
  list() {
    return this.boards.list();
  }

  @Post()
  create(@Body() dto: CreateBoardDto) {
    return this.boards.create(dto);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.boards.get(id);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBoardDto) {
    return this.boards.update(id, dto);
  }

  @Post(':id/archive')
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BoardVersionDto,
  ) {
    return this.boards.archive(id, dto);
  }

  @Post(':id/stages')
  addStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateStageDto,
  ) {
    return this.boards.addStage(id, dto);
  }

  @Patch(':id/stages/:stageId')
  updateStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.boards.updateStage(id, stageId, dto);
  }

  @Post(':id/stages/:stageId/archive')
  archiveStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() dto: RemoveStageDto,
  ) {
    return this.boards.removeStage(id, stageId, dto, true);
  }

  @Delete(':id/stages/:stageId')
  deleteStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() dto: RemoveStageDto,
  ) {
    return this.boards.removeStage(id, stageId, dto, false);
  }

  @Put(':id/stage-order')
  reorder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderStagesDto,
  ) {
    return this.boards.reorder(id, dto);
  }

  @Get(':id/cards')
  cards(@Param('id', ParseUUIDPipe) id: string, @Query() query: CardsQueryDto) {
    return this.boards.listCards(id, query);
  }

  @Post(':id/cards')
  assign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignCardDto) {
    return this.boards.assignCard(id, dto);
  }
}
