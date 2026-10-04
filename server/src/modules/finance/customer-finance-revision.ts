import { createHash } from 'node:crypto';
import { EntityManager } from 'typeorm';
import { OrderGroup } from '../order-groups/entities/order-group.entity';
import { Order } from '../orders/entities/order.entity';
import { FinancialAccrual } from './entities/financial-accrual.entity';
import { FinancialPaymentAllocation } from './entities/financial-payment-allocation.entity';
import { FinancialPayment } from './entities/financial-payment.entity';

const normalizedValue = (value: unknown): string | null => {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  return JSON.stringify(value);
};

const normalizedRows = (rows: Record<string, unknown>[]) =>
  rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, normalizedValue(value)]),
    ),
  );

export async function getCustomerFinanceRevision(
  manager: EntityManager,
  customerId: string,
): Promise<string> {
  const [groups, orders, accruals, payments, allocations] = await Promise.all([
    manager
      .getRepository(OrderGroup)
      .createQueryBuilder('group')
      .select('group.id', 'id')
      .addSelect('group.status', 'status')
      .addSelect('group.managementVersion', 'managementVersion')
      .where('group.customerId = :customerId', { customerId })
      .orderBy('group.id', 'ASC')
      .getRawMany<Record<string, unknown>>(),
    manager
      .getRepository(Order)
      .createQueryBuilder('orders')
      .innerJoin(OrderGroup, 'group', 'group.id = orders.orderGroupId')
      .select('orders.id', 'id')
      .addSelect('orders.orderGroupId', 'orderGroupId')
      .addSelect('orders.totalPrice', 'totalPrice')
      .where('group.customerId = :customerId', { customerId })
      .orderBy('orders.id', 'ASC')
      .getRawMany<Record<string, unknown>>(),
    manager
      .getRepository(FinancialAccrual)
      .createQueryBuilder('accrual')
      .select('accrual.id', 'id')
      .addSelect('accrual.orderGroupId', 'orderGroupId')
      .addSelect('accrual.status', 'status')
      .addSelect('accrual.version', 'version')
      .where('accrual.customerId = :customerId', { customerId })
      .orderBy('accrual.id', 'ASC')
      .getRawMany<Record<string, unknown>>(),
    manager
      .getRepository(FinancialPayment)
      .createQueryBuilder('payment')
      .select('payment.id', 'id')
      .addSelect('payment.amountMinor', 'amountMinor')
      .addSelect('payment.paymentDate', 'paymentDate')
      .addSelect('payment.status', 'status')
      .addSelect('payment.version', 'version')
      .where('payment.customerId = :customerId', { customerId })
      .orderBy('payment.id', 'ASC')
      .getRawMany<Record<string, unknown>>(),
    manager
      .getRepository(FinancialPaymentAllocation)
      .createQueryBuilder('allocation')
      .innerJoin(
        FinancialPayment,
        'payment',
        'payment.id = allocation.paymentId',
      )
      .select('allocation.id', 'id')
      .addSelect('allocation.paymentId', 'paymentId')
      .addSelect('allocation.accrualId', 'accrualId')
      .addSelect('allocation.amountMinor', 'amountMinor')
      .addSelect('allocation.status', 'status')
      .where('payment.customerId = :customerId', { customerId })
      .orderBy('allocation.id', 'ASC')
      .getRawMany<Record<string, unknown>>(),
  ]);

  return createHash('sha256')
    .update(
      JSON.stringify(
        [groups, orders, accruals, payments, allocations].map(normalizedRows),
      ),
    )
    .digest('hex');
}
