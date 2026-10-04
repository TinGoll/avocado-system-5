import { OrderStatus } from '../../order-groups/entities/order-group.entity';
import { CustomerOrderFinancialStatus } from '../customer-finance';
import { FinancialAccrualStatus } from '../entities/financial-accrual.entity';

export class CustomerFinanceOrderDto {
  id: number;
  name: string;
  orderNumber: string;
  createdAt: Date;
  systemStatus: OrderStatus;
  closed: boolean;
  allocationAvailable: boolean;
  accrualId: string | null;
  accrualStatus: FinancialAccrualStatus | null;
  total: string;
  paid: string;
  debt: string;
  missingToHalf: string;
  financialStatus: CustomerOrderFinancialStatus;
}

export class CustomerFinancePageDto {
  customer: {
    id: string;
    name: string;
    companyName: string | null;
    city: string | null;
  };
  unallocatedBalance: string;
  revision: string;
  availableSystemStatuses: OrderStatus[];
  orders: CustomerFinanceOrderDto[];
}
