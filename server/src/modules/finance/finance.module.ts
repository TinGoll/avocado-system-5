import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialAccrual } from './entities/financial-accrual.entity';
import { FinancialAccrualEntry } from './entities/financial-accrual-entry.entity';
import { FinancialPayment } from './entities/financial-payment.entity';
import { FinancialPaymentAllocation } from './entities/financial-payment-allocation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinancialAccrual,
      FinancialAccrualEntry,
      FinancialPayment,
      FinancialPaymentAllocation,
    ]),
  ],
})
export class FinanceModule {}
