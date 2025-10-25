import { Module } from '@nestjs/common';
import { PanelsService } from './panels.service';
import { PanelsController } from './panels.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Panel } from './entities/panel.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Panel])],
  controllers: [PanelsController],
  providers: [PanelsService],
})
export class PanelsModule {}
