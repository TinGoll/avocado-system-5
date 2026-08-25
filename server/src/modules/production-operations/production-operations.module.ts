import { Module } from '@nestjs/common';
import { ProductionOperationsService } from './production-operations.service';
import { ProductionOperationsController } from './production-operations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductionOperation } from './entities/production-operation.entity';
import { ProductionOperationCalculatorService } from './production-operation-calculator.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductionOperation])],
  controllers: [ProductionOperationsController],
  providers: [
    ProductionOperationsService,
    ProductionOperationCalculatorService,
  ],
  exports: [ProductionOperationCalculatorService],
})
export class ProductionOperationsModule {}
