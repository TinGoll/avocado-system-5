import { Module } from '@nestjs/common';
import { ModifiersService } from './modifiers.service';
import { ModifiersController } from './modifiers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Modifier } from './entities/modifier.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Modifier])],
  controllers: [ModifiersController],
  providers: [ModifiersService],
})
export class ModifiersModule {}
