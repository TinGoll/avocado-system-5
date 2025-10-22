import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './modules/database/database.module';
import { ProductionOperationsModule } from './modules/production-operations/production-operations.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PriceModifiersModule } from './modules/price-modifiers/price-modifiers.module';
import { PricingModule } from './modules/pricing/pricing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    ProductionOperationsModule,
    ProductsModule,
    OrdersModule,
    PriceModifiersModule,
    PricingModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
