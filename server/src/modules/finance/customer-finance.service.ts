import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Customer } from '../customers/entities/customer.entity';
import {
  OrderGroup,
  OrderStatus,
} from '../order-groups/entities/order-group.entity';
import {
  getCustomerOrderFinancialStatus,
  getMissingToHalfMinor,
  isAllocatableOrderStatus,
  isClosedOrderStatus,
} from './customer-finance';
import { CustomerFinancePageDto } from './dto/customer-finance.dto';
import {
  FinancialAccrual,
  FinancialAccrualStatus,
} from './entities/financial-accrual.entity';
import {
  FinancialPaymentAllocation,
  FinancialPaymentAllocationStatus,
} from './entities/financial-payment-allocation.entity';
import {
  FinancialPayment,
  FinancialPaymentStatus,
} from './entities/financial-payment.entity';
import {
  assertSafeMinorAmount,
  formatMinorToRubles,
  parseRublesToMinor,
} from './finance-money';
import { getCustomerFinanceRevision } from './customer-finance-revision';

type AccrualTotals = {
  id: string;
  orderGroupId: number;
  status: FinancialAccrualStatus;
  allocatedMinor: number;
};

@Injectable()
export class CustomerFinanceService {
  constructor(private readonly source: DataSource) {}

  async getPage(customerId: string): Promise<CustomerFinancePageDto> {
    const customer = await this.source.getRepository(Customer).findOneBy({
      id: customerId,
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const groups = await this.source.getRepository(OrderGroup).find({
      where: { customerId },
      relations: { orders: true },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    const groupIds = groups.map((group) => group.id);
    const [accruals, unallocatedMinor, revision] = await Promise.all([
      this.getAccrualTotals(customerId, groupIds),
      this.getUnallocatedMinor(customerId),
      getCustomerFinanceRevision(this.source.manager, customerId),
    ]);
    const accrualByGroup = new Map(
      accruals.map((accrual) => [accrual.orderGroupId, accrual]),
    );

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        companyName: customer.companyName ?? null,
        city:
          typeof customer.attributes?.city === 'string'
            ? customer.attributes.city
            : null,
      },
      unallocatedBalance: formatMinorToRubles(unallocatedMinor),
      revision,
      availableSystemStatuses: Object.values(OrderStatus),
      orders: groups.map((group) => {
        const totalMinor = group.orders.reduce(
          (sum, order) =>
            sum +
            parseRublesToMinor(Number(order.totalPrice).toFixed(2), {
              allowNegative: true,
              allowZero: true,
            }),
          0,
        );
        assertSafeMinorAmount(totalMinor);
        const accrual = accrualByGroup.get(group.id);
        const paidMinor = accrual?.allocatedMinor ?? 0;
        const debtMinor = Math.max(totalMinor - paidMinor, 0);
        const financialStatus = getCustomerOrderFinancialStatus(
          totalMinor,
          paidMinor,
        );
        const allocationAvailable =
          isAllocatableOrderStatus(group.status) &&
          accrual?.status === FinancialAccrualStatus.ACTIVE &&
          debtMinor > 0 &&
          unallocatedMinor > 0;

        return {
          id: group.id,
          name: group.orderNumber,
          orderNumber: group.orderNumber,
          createdAt: group.createdAt,
          systemStatus: group.status,
          closed: isClosedOrderStatus(group.status),
          allocationAvailable,
          accrualId: accrual?.id ?? null,
          accrualStatus: accrual?.status ?? null,
          total: formatMinorToRubles(totalMinor),
          paid: formatMinorToRubles(paidMinor),
          debt: formatMinorToRubles(debtMinor),
          missingToHalf: formatMinorToRubles(
            getMissingToHalfMinor(totalMinor, paidMinor),
          ),
          financialStatus,
        };
      }),
    };
  }

  private async getAccrualTotals(
    customerId: string,
    groupIds: number[],
  ): Promise<AccrualTotals[]> {
    if (groupIds.length === 0) return [];
    const accruals = await this.source.getRepository(FinancialAccrual).find({
      where: { customerId, orderGroupId: In(groupIds) },
      order: { orderGroupId: 'ASC' },
    });
    if (accruals.length === 0) return [];

    const accrualIds = accruals.map((accrual) => accrual.id);
    const allocationRows = await this.source
      .getRepository(FinancialPaymentAllocation)
      .createQueryBuilder('allocation')
      .select('allocation.accrualId', 'accrualId')
      .addSelect('SUM(allocation.amountMinor)', 'amount')
      .where('allocation.accrualId IN (:...accrualIds)', { accrualIds })
      .andWhere('allocation.status = :status', {
        status: FinancialPaymentAllocationStatus.ACTIVE,
      })
      .groupBy('allocation.accrualId')
      .getRawMany<{ accrualId: string; amount: string | number }>();
    const allocations = new Map(
      allocationRows.map((row) => [row.accrualId, this.number(row.amount)]),
    );
    return accruals.map((accrual) => ({
      id: accrual.id,
      orderGroupId: accrual.orderGroupId!,
      status: accrual.status,
      allocatedMinor: allocations.get(accrual.id) ?? 0,
    }));
  }

  private async getUnallocatedMinor(customerId: string): Promise<number> {
    const [paymentRow, allocationRow] = await Promise.all([
      this.source
        .getRepository(FinancialPayment)
        .createQueryBuilder('payment')
        .select('COALESCE(SUM(payment.amountMinor), 0)', 'amount')
        .where('payment.customerId = :customerId', { customerId })
        .andWhere('payment.status = :status', {
          status: FinancialPaymentStatus.POSTED,
        })
        .getRawOne<{ amount: string | number }>(),
      this.source
        .getRepository(FinancialPaymentAllocation)
        .createQueryBuilder('allocation')
        .innerJoin(
          FinancialPayment,
          'payment',
          'payment.id = allocation.paymentId',
        )
        .select('COALESCE(SUM(allocation.amountMinor), 0)', 'amount')
        .where('payment.customerId = :customerId', { customerId })
        .andWhere('payment.status = :paymentStatus', {
          paymentStatus: FinancialPaymentStatus.POSTED,
        })
        .andWhere('allocation.status = :allocationStatus', {
          allocationStatus: FinancialPaymentAllocationStatus.ACTIVE,
        })
        .getRawOne<{ amount: string | number }>(),
    ]);
    const result =
      this.number(paymentRow?.amount) - this.number(allocationRow?.amount);
    assertSafeMinorAmount(result);
    return result;
  }

  private number(value: unknown): number {
    const result = Number(value ?? 0);
    assertSafeMinorAmount(result);
    return result;
  }
}
