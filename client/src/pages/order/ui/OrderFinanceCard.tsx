import { css } from '@emotion/css';
import { Alert, Button, Card, Descriptions, Skeleton, Space, Tag } from 'antd';
import { type FC, useState } from 'react';

import { formatFinanceMoney, useOrderFinance } from '@entities/finance';
import type { OrderGroup } from '@entities/order';
import {
  type FinanceDialogAction,
  FinanceMutationModals,
} from '@features/record-payment';
import type { FinanceAccrual, FinanceCustomerListItem } from '@shared/api';

const styles = {
  card: css`
    margin-bottom: 12px;

    .ant-descriptions-item-content {
      white-space: nowrap;
    }
  `,
  actions: css`
    margin-top: 12px;
  `,
};

export const OrderFinanceCard: FC<{ group: OrderGroup }> = ({ group }) => {
  const finance = useOrderFinance(group.id);
  const [action, setAction] = useState<FinanceDialogAction | null>(null);

  if (finance.isLoading) {
    return <Skeleton active paragraph={{ rows: 2 }} />;
  }

  if (finance.error || !finance.data) {
    return (
      <Alert
        showIcon
        type="error"
        title="Не удалось загрузить финансы заказа"
        action={
          <Button onClick={() => void finance.mutate()}>Повторить</Button>
        }
      />
    );
  }

  const data = finance.data;
  const customer: FinanceCustomerListItem | null = group.customerId
    ? {
        id: group.customerId,
        name: group.customer?.name ?? 'Заказчик',
        companyName: group.customer?.companyName ?? null,
        debtMinor: 0,
        debt: '0.00',
        advanceMinor: data.customerUnallocatedAdvanceMinor,
        advance: data.customerUnallocatedAdvance,
        unallocatedMinor: data.customerUnallocatedAdvanceMinor,
        unallocated: data.customerUnallocatedAdvance,
      }
    : null;
  const accrual: FinanceAccrual | null =
    data.accrualId && group.customerId && data.accrualVersion !== null
      ? {
          id: data.accrualId,
          customerId: group.customerId,
          customerName: customer?.companyName ?? customer?.name ?? 'Заказчик',
          sourceType: 'order',
          orderGroupId: group.id,
          orderNumber: group.orderNumber,
          title: group.orderNumber,
          status: data.accrualStatus ?? 'active',
          version: data.accrualVersion,
          businessDate: '',
          amountMinor: data.accruedMinor,
          amount: data.accrued,
          allocatedMinor: data.allocatedMinor,
          allocated: data.allocated,
          remainingMinor: data.remainingMinor,
          remaining: data.remaining,
          state:
            data.accrualStatus === 'cancelled'
              ? 'cancelled'
              : data.remainingMinor === 0
                ? 'paid'
                : data.allocatedMinor > 0
                  ? 'partially_paid'
                  : 'unpaid',
        }
      : null;

  return (
    <>
      <Card className={styles.card} size="small" title="Финансы заказа">
        {!group.customerId && (
          <Alert
            showIcon
            type="warning"
            title="У заказа не выбран заказчик"
            description="Начисление и оплата недоступны до привязки заказчика."
          />
        )}
        {group.customerId && data.accrualStatus === null && (
          <Alert showIcon type="info" title="Начисление ещё не создано" />
        )}
        {data.accrualStatus === 'cancelled' && (
          <Alert showIcon type="warning" title="Начисление аннулировано" />
        )}
        {data.accrualStatus === 'active' && data.remainingMinor === 0 && (
          <Alert showIcon type="success" title="Заказ полностью оплачен" />
        )}
        <Descriptions column={{ xs: 1, sm: 1, lg: 2, xl: 3 }} size="small">
          <Descriptions.Item label="Рассчитано по документам">
            {formatFinanceMoney(data.orderTotal)}
          </Descriptions.Item>
          <Descriptions.Item label="Начислено">
            {formatFinanceMoney(data.accrued)}
          </Descriptions.Item>
          <Descriptions.Item label="Оплачено распределениями">
            {formatFinanceMoney(data.allocated)}
          </Descriptions.Item>
          <Descriptions.Item label="Остаток">
            {formatFinanceMoney(data.remaining)}
          </Descriptions.Item>
          <Descriptions.Item label="Разница с текущей ценой">
            {formatFinanceMoney(data.syncDifference)}
          </Descriptions.Item>
          <Descriptions.Item label="Нераспределённый аванс заказчика">
            {formatFinanceMoney(data.customerUnallocatedAdvance)}
          </Descriptions.Item>
        </Descriptions>
        {data.accrualStatus && (
          <Tag color={data.accrualStatus === 'active' ? 'blue' : 'default'}>
            {data.accrualStatus === 'active'
              ? 'Начисление активно'
              : 'Аннулировано'}
          </Tag>
        )}
        <Space className={styles.actions} wrap>
          {group.customerId && data.accrualStatus === null && (
            <Button
              type="primary"
              onClick={() =>
                setAction({
                  type: 'create-order-accrual',
                  orderGroupId: group.id,
                })
              }
            >
              Создать начисление
            </Button>
          )}
          {accrual?.status === 'active' && (
            <Button
              onClick={() => setAction({ type: 'sync-accrual', accrual })}
            >
              Обновить начисление
            </Button>
          )}
          {customer && (
            <Button
              onClick={() =>
                setAction({
                  type: 'payment',
                  customerId: customer.id,
                  initialAllocation:
                    accrual?.status === 'active' && data.remainingMinor > 0
                      ? { accrualId: accrual.id, amount: data.remaining }
                      : undefined,
                })
              }
            >
              Добавить оплату
            </Button>
          )}
        </Space>
      </Card>
      <FinanceMutationModals
        action={action}
        customers={customer ? [customer] : []}
        onClose={() => setAction(null)}
      />
    </>
  );
};
