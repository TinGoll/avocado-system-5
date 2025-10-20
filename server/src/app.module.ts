import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './modules/database/database.module';
import { ProductionOperationsModule } from './modules/production-operations/production-operations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    ProductionOperationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
