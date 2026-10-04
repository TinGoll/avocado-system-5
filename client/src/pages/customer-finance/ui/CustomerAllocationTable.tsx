import { css, cx } from '@emotion/css';
import {
  Button,
  Checkbox,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { FC } from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import type { CustomerFinanceOrder } from '@shared/api';

import {
  type AllocationReasons,
  type AllocationValues,
  allocationError,
  allocationTotal,
  fillFullDebt,
  fillToHalf,
  formatMinor,
  isPartialFullPayment,
  parseRublesToMinor,
  parseSignedRublesToMinor,
} from '../model/customer-allocation';

const styles = {
  toolbar: css`
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
  `,
  controls: css`
    display: grid;
    grid-template-columns:
      minmax(220px, 1fr) minmax(220px, 320px) minmax(190px, 260px)
      auto;
    gap: 12px;
    align-items: center;
    margin-bottom: 16px;
    @media (max-width: 980px) {
      grid-template-columns: 1fr 1fr;
    }
    @media (max-width: 600px) {
      grid-template-columns: 1fr;
    }
  `,
  orderName: css`
    display: grid;
    gap: 3px;
  `,
  date: css`
    color: rgba(0, 0, 0, 0.55);
    font-size: 12px;
  `,
  amountInput: css`
    min-width: 132px;
  `,
  actions: css`
    min-width: 240px;
  `,
  filledRow: css`
    td {
      background: #f6ffed !important;
    }
  `,
  partialRow: css`
    td {
      box-shadow: inset 3px 0 0 #faad14;
    }
  `,
  closedRow: css`
    opacity: 0.65;
  `,
  balanceError: css`
    margin-top: 8px;
    color: #cf1322;
  `,
};

const statusLabel: Record<CustomerFinanceOrder['systemStatus'], string> = {
  draft: 'Черновик',
  in_production: 'В работе',
  completed: 'Закрыт',
  cancelled: 'Отменён',
};
const financialLabel: Record<CustomerFinanceOrder['financialStatus'], string> =
  {
    unpaid: 'Не оплачен',
    partially_paid: 'Частично оплачен',
    prepaid: 'Предоплата внесена',
    paid: 'Оплачен',
  };
const date = (value: string) =>
  new Intl.DateTimeFormat('ru-RU').format(new Date(value));

export const CustomerAllocationTable: FC<{
  orders: CustomerFinanceOrder[];
  balance: string;
  availableStatuses: CustomerFinanceOrder['systemStatus'][];
  values: AllocationValues;
  reasons: AllocationReasons;
  onChange: (values: AllocationValues) => void;
  onAutoAllocate: () => void;
}> = ({
  orders,
  balance,
  availableStatuses,
  values,
  reasons,
  onChange,
  onAutoAllocate,
}) => {
  const [search, setSearch] = useState('');
  const [statuses, setStatuses] = useState<
    CustomerFinanceOrder['systemStatus'][]
  >([]);
  const [financeStatus, setFinanceStatus] =
    useState<CustomerFinanceOrder['financialStatus']>();
  const [showClosed, setShowClosed] = useState(false);
  const balanceMinor = parseSignedRublesToMinor(balance) ?? 0;
  const enteredMinor = allocationTotal(values);
  const disabled = balanceMinor <= 0;
  const totalError = enteredMinor > Math.max(balanceMinor, 0);
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('ru-RU');
    return [...orders]
      .filter((order) => showClosed || !order.closed)
      .filter((order) =>
        term ? order.name.toLocaleLowerCase('ru-RU').includes(term) : true,
      )
      .filter(
        (order) => !statuses.length || statuses.includes(order.systemStatus),
      )
      .filter(
        (order) => !financeStatus || order.financialStatus === financeStatus,
      )
      .sort(
        (left, right) =>
          new Date(left.createdAt).getTime() -
            new Date(right.createdAt).getTime() || left.id - right.id,
      );
  }, [financeStatus, orders, search, showClosed, statuses]);

  const setValue = (id: number, value: string) =>
    onChange({ ...values, [id]: value });

  return (
    <>
      <div className={styles.toolbar}>
        <Button disabled={disabled} onClick={onAutoAllocate}>
          Распределить автоматически
        </Button>
      </div>
      <div className={styles.controls}>
        <Input.Search
          allowClear
          aria-label="Поиск по названию заказа"
          placeholder="Поиск по названию заказа"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          allowClear
          mode="multiple"
          aria-label="Системные статусы"
          placeholder="Все системные статусы"
          value={statuses}
          options={availableStatuses.map((status) => ({
            value: status,
            label: statusLabel[status],
          }))}
          onChange={setStatuses}
        />
        <Select
          allowClear
          aria-label="Финансовый статус"
          placeholder="Все финансовые статусы"
          value={financeStatus}
          options={Object.entries(financialLabel).map(([value, label]) => ({
            value,
            label,
          }))}
          onChange={setFinanceStatus}
        />
        <Checkbox
          checked={showClosed}
          onChange={(event) => setShowClosed(event.target.checked)}
        >
          Показывать закрытые
        </Checkbox>
      </div>

      <Table<CustomerFinanceOrder>
        rowKey="id"
        pagination={false}
        scroll={{ x: 1280 }}
        dataSource={visible}
        onRow={(order) => ({
          'aria-label': isPartialFullPayment(order, values[order.id] ?? '')
            ? 'Частичное погашение из-за недостаточного баланса'
            : undefined,
        })}
        rowClassName={(order) => {
          const value = values[order.id] ?? '';
          const amount = parseRublesToMinor(value) ?? 0;
          return cx({
            [styles.filledRow]: amount > 0,
            [styles.partialRow]: isPartialFullPayment(order, value),
            [styles.closedRow]: order.closed,
          });
        }}
        columns={[
          {
            title: 'Заказ',
            render: (_, order) => (
              <div className={styles.orderName}>
                <Link to={`/order/${order.id}`}>
                  {order.name} · №{order.orderNumber}
                </Link>
                <span className={styles.date}>{date(order.createdAt)}</span>
              </div>
            ),
          },
          {
            title: 'Системный статус',
            render: (_, order) => <Tag>{statusLabel[order.systemStatus]}</Tag>,
          },
          {
            title: 'Финансовый статус',
            render: (_, order) => financialLabel[order.financialStatus],
          },
          { title: 'Стоимость', dataIndex: 'total' },
          { title: 'Оплачено', dataIndex: 'paid' },
          { title: 'Долг', dataIndex: 'debt' },
          { title: 'До 50%', dataIndex: 'missingToHalf' },
          {
            title: 'Распределить',
            render: (_, order) => {
              const value = values[order.id] ?? '';
              const debtMinor = parseRublesToMinor(order.debt) ?? 0;
              const error = allocationError(value, debtMinor);
              return (
                <div className={styles.amountInput}>
                  <Input
                    aria-label={`Сумма для заказа ${order.name}`}
                    disabled={disabled || !order.allocationAvailable}
                    inputMode="decimal"
                    status={error ? 'error' : undefined}
                    value={value}
                    onChange={(event) => setValue(order.id, event.target.value)}
                  />
                  {error ? (
                    <Typography.Text type="danger">{error}</Typography.Text>
                  ) : null}
                  {reasons[order.id] ? (
                    <Typography.Text type="secondary">
                      {reasons[order.id]}
                    </Typography.Text>
                  ) : null}
                </div>
              );
            },
          },
          {
            title: 'Быстрые действия',
            render: (_, order) => (
              <Space className={styles.actions} size="small" wrap>
                <Button
                  size="small"
                  disabled={disabled || !order.allocationAvailable}
                  onClick={() => setValue(order.id, fillToHalf(order))}
                >
                  До 50%
                </Button>
                <Button
                  size="small"
                  disabled={disabled || !order.allocationAvailable}
                  onClick={() =>
                    setValue(
                      order.id,
                      fillFullDebt(order, balanceMinor, values),
                    )
                  }
                >
                  Погасить полностью
                </Button>
                <Button
                  size="small"
                  disabled={!values[order.id] || !order.allocationAvailable}
                  onClick={() => setValue(order.id, '')}
                >
                  Очистить
                </Button>
              </Space>
            ),
          },
        ]}
      />
      {totalError ? (
        <div className={styles.balanceError} role="alert">
          Общая сумма превышает доступный нераспределённый баланс
        </div>
      ) : null}
      <span aria-label="Введено к распределению" hidden>
        {formatMinor(enteredMinor)}
      </span>
    </>
  );
};
