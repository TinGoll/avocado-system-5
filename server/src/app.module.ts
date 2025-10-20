import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './modules/database/database.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PriceCalculationModule } from './modules/price-calculation/price-calculation.module';
import { ProductsModule } from './modules/products/products.module';
import { OptionsModule } from './modules/options/options.module';
import { ModifiersModule } from './modules/modifiers/modifiers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    OrdersModule,
    PriceCalculationModule,
    ProductsModule,
    OptionsModule,
    ModifiersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
