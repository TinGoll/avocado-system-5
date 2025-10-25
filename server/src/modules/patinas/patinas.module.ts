import { Module } from '@nestjs/common';
import { PatinasService } from './patinas.service';
import { PatinasController } from './patinas.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patina } from './entities/patina.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Patina])],
  controllers: [PatinasController],
  providers: [PatinasService],
})
export class PatinasModule {}
