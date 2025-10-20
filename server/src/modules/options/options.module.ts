import { Module } from '@nestjs/common';
import { OptionsService } from './options.service';
import { OptionsController } from './options.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OptionGroup } from './entities/option-group.entity';
import { OptionValue } from './entities/option.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OptionValue, OptionGroup])],
  controllers: [OptionsController],
  providers: [OptionsService],
})
export class OptionsModule {}
