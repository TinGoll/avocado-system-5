import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionBoard } from './entities/production-board.entity';
import { ProductionStage } from './entities/production-stage.entity';
import { ProductionBoardsController } from './production-boards.controller';
import { ProductionBoardsService } from './production-boards.service';
import { ProductionCard } from './entities/production-card.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderGroup } from '../order-groups/entities/order-group.entity';
import { OrderManagementModule } from '../order-management/order-management.module';
import { ProductionCardsController } from './production-cards.controller';
import { OrderGroupProductionController } from './order-group-production.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductionBoard,
      ProductionStage,
      ProductionCard,
      Order,
      OrderGroup,
    ]),
    OrderManagementModule,
  ],
  controllers: [
    ProductionBoardsController,
    ProductionCardsController,
    OrderGroupProductionController,
  ],
  providers: [ProductionBoardsService],
})
export class ProductionBoardsModule {}
