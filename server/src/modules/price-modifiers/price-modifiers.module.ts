import { Module } from '@nestjs/common';
import { PriceModifiersService } from './price-modifiers.service';
import { PriceModifiersController } from './price-modifiers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceModifier } from './entities/price-modifier.entity';
import { ProductTemplate } from '../products/entities/product-template.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PriceModifier, ProductTemplate])],
  controllers: [PriceModifiersController],
  providers: [PriceModifiersService],
})
export class PriceModifiersModule {}
