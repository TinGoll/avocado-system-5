import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductTemplate } from './entities/product-template.entity';
import { ProductionOperation } from '../production-operations/entities/production-operation.entity';
import { PriceModifier } from '../price-modifiers/entities/price-modifier.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductTemplate,
      ProductionOperation,
      PriceModifier,
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
