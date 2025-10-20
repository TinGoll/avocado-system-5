import { Module } from '@nestjs/common';
import { PriceCalculationService } from './price-calculation.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { ProductOptionModifier } from '../products/entities/product-option-modifier.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductOptionModifier])],
  providers: [PriceCalculationService],
  exports: [PriceCalculationService],
})
export class PriceCalculationModule {}
