import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FinancialAccrual } from './entities/financial-accrual.entity';
import { FinancialAccrualEntry } from './entities/financial-accrual-entry.entity';
import { FinancialPayment } from './entities/financial-payment.entity';
import { FinancialPaymentAllocation } from './entities/financial-payment-allocation.entity';
import { FinanceController } from './finance.controller';
import { FinanceAccrualsService } from './finance-accruals.service';
import { OrderGroup } from '../order-groups/entities/order-group.entity';
import { Order } from '../orders/entities/order.entity';
import { Customer } from '../customers/entities/customer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinancialAccrual,
      FinancialAccrualEntry,
      FinancialPayment,
      FinancialPaymentAllocation,
      OrderGroup,
      Order,
      Customer,
    ]),
  ],
  controllers: [FinanceController],
  providers: [FinanceAccrualsService],
})
export class FinanceModule {}
