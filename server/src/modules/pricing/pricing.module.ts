import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceModifier } from '../price-modifiers/entities/price-modifier.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PriceModifier])],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
