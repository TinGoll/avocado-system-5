import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceModifier } from '../price-modifiers/entities/price-modifier.entity';
import { ProductionOperationsModule } from '../production-operations/production-operations.module';
import { ProductsModule } from '../products/products.module';
import { TemplateVariablesModule } from '../../common/template-variables/template-variables.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PriceModifier]),
    ProductionOperationsModule,
    ProductsModule,
    TemplateVariablesModule,
  ],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
