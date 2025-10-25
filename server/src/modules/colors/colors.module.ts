import { Module } from '@nestjs/common';
import { ColorsService } from './colors.service';
import { ColorsController } from './colors.controller';
import { Color } from './entities/color.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Color])],
  controllers: [ColorsController],
  providers: [ColorsService],
})
export class ColorsModule {}
