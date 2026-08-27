import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductTemplate } from './entities/product-template.entity';
import { ProductionOperation } from '../production-operations/entities/production-operation.entity';
import { PriceModifier } from '../price-modifiers/entities/price-modifier.entity';
import { TemplateVariablesModule } from '../../common/template-variables/template-variables.module';
import { ProductDisplayTemplateService } from './product-display-template.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductTemplate,
      ProductionOperation,
      PriceModifier,
    ]),
    TemplateVariablesModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, ProductDisplayTemplateService],
  exports: [ProductDisplayTemplateService],
})
export class ProductsModule {}
