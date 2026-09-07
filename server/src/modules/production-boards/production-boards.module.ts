import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionBoard } from './entities/production-board.entity';
import { ProductionStage } from './entities/production-stage.entity';
import { ProductionBoardsController } from './production-boards.controller';
import { ProductionBoardsService } from './production-boards.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductionBoard, ProductionStage])],
  controllers: [ProductionBoardsController],
  providers: [ProductionBoardsService],
})
export class ProductionBoardsModule {}
