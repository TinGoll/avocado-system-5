import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './modules/database/database.module';
import { ProductionOperationsModule } from './modules/production-operations/production-operations.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PriceModifiersModule } from './modules/price-modifiers/price-modifiers.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { ColorsModule } from './modules/colors/colors.module';
import { MaterialModule } from './modules/material/material.module';
import { VarnishModule } from './modules/varnish/varnish.module';
import { PatinasModule } from './modules/patinas/patinas.module';
import { PanelsModule } from './modules/panels/panels.module';
import { FacadeProfilesModule } from './modules/facade-profiles/facade-profiles.module';

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
    ColorsModule,
    MaterialModule,
    VarnishModule,
    PatinasModule,
    PanelsModule,
    FacadeProfilesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
