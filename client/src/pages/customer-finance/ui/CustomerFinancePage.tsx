import { css } from '@emotion/css';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  Modal,
  Space,
  Spin,
  Statistic,
  Table,
  Typography,
} from 'antd';
import { isAxiosError } from 'axios';
import { type FC, type ReactNode, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { formatFinanceMoney } from '@entities/finance';
import {
  type FinanceDialogAction,
  FinanceMutationModals,
} from '@features/record-payment';
import {
  createFinanceAllocationBatch,
  type CustomerFinanceHistoryItem,
  type CustomerFinanceHistoryType,
} from '@shared/api';

import {
  useCustomerFinanceHistory,
  useCustomerFinancePage,
} from '../api/customer-finance';
import {
  type AllocationReasons,
  type AllocationValues,
  allocationTotal,
  autoAllocate,
  formatMinor,
  hasAllocationErrors,
  parseRublesToMinor,
  parseSignedRublesToMinor,
} from '../model/customer-allocation';
import { useAllocationDraftGuard } from '../model/use-allocation-draft-guard';

import { CustomerAllocationTable } from './CustomerAllocationTable';

const styles = {
  page: css`
    width: 100%;
    box-sizing: border-box;
    padding: 16px;
  `,
  content: css`
    width: 100%;
    min-width: 0;
    > .ant-space-item {
      min-width: 0;
      width: 100%;
    }
  `,
  header: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    @media (max-width: 600px) {
      flex-direction: column;
    }
  `,
  title: css`
    && {
      margin: 4px 0;
    }
  `,
  muted: css`
    color: rgba(0, 0, 0, 0.55);
  `,
  summary: css`
    display: grid;
    grid-template-columns: repeat(3, minmax(180px, 1fr));
    gap: 12px;
    @media (max-width: 900px) {
      grid-template-columns: repeat(2, minmax(150px, 1fr));
    }
    @media (max-width: 500px) {
      grid-template-columns: 1fr;
    }
  `,
  sectionTitle: css`
    && {
      margin: 0 0 12px;
    }
  `,
  center: css`
    display: flex;
    min-height: 220px;
    align-items: center;
    justify-content: center;
  `,
  detail: css`
    display: grid;
    gap: 6px;
    padding: 8px 16px;
  `,
  savePanel: css`
    display: grid;
    grid-template-columns: minmax(240px, 1fr) auto;
    gap: 12px;
    align-items: end;
    margin-top: 16px;
    @media (max-width: 600px) {
      grid-template-columns: 1fr;
    }
  `,
  historyToolbar: css`
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  `,
};

type HistoryCategory = 'payments' | 'allocations' | 'returns' | 'adjustments';

const historyCategoryTypes: Record<
  HistoryCategory,
  CustomerFinanceHistoryType[]
> = {
  payments: ['payment'],
  allocations: ['allocation'],
  returns: ['payment_cancellation', 'allocation_release', 'reversal'],
  adjustments: ['adjustment'],
};

const historyTypeLabels: Record<CustomerFinanceHistoryType, string> = {
  payment: 'Оплата',
  allocation: 'Распределение',
  payment_cancellation: 'Аннулирование оплаты',
  allocation_release: 'Возврат распределения',
  adjustment: 'Корректировка',
  reversal: 'Возврат',
};

const dateTime = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));

const State: FC<{
  loading: boolean;
  error: unknown;
  empty?: boolean;
  emptyText?: string;
  retry: () => unknown;
  children: ReactNode;
}> = ({ loading, error, empty, emptyText, retry, children }) => {
  if (loading)
    return (
      <div className={styles.center}>
        <Spin aria-label="Загрузка финансов заказчика" />
      </div>
    );
  if (error)
    return (
      <Alert
        showIcon
        type="error"
        title="Не удалось загрузить данные"
        action={<Button onClick={() => void retry()}>Повторить</Button>}
      />
    );
  if (empty) return <Empty description={emptyText} />;
  return children;
};

export const CustomerFinancePage: FC = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [historyCategories, setHistoryCategories] = useState<HistoryCategory[]>(
    ['payments', 'allocations', 'returns', 'adjustments'],
  );
  const [historyCursor, setHistoryCursor] = useState<string>();
  const [historyBackStack, setHistoryBackStack] = useState<
    Array<string | undefined>
  >([]);
  const historyTypes = useMemo(
    () =>
      historyCategories.flatMap((category) => historyCategoryTypes[category]),
    [historyCategories],
  );
  const finance = useCustomerFinancePage(customerId);
  const history = useCustomerFinanceHistory(customerId, {
    cursor: historyCursor,
    limit: 10,
    types: historyTypes,
  });
  const [dialogAction, setDialogAction] = useState<FinanceDialogAction | null>(
    null,
  );
  const [allocationValues, setAllocationValues] = useState<AllocationValues>(
    {},
  );
  const [allocationReasons, setAllocationReasons] = useState<AllocationReasons>(
    {},
  );
  const [comment, setComment] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const requestId = useRef(crypto.randomUUID());
  const submittingRef = useRef(false);
  const balanceMinor =
    parseSignedRublesToMinor(finance.data?.unallocatedBalance ?? '0') ?? 0;
  const enteredMinor = allocationTotal(allocationValues);
  useAllocationDraftGuard(enteredMinor > 0);

  const resetRequest = () => {
    requestId.current = crypto.randomUUID();
  };
  const changeValues = (next: AllocationValues) => {
    const changed = new Set(
      [
        ...new Set([...Object.keys(allocationValues), ...Object.keys(next)]),
      ].filter((id) => allocationValues[Number(id)] !== next[Number(id)]),
    );
    setAllocationReasons(
      (current) =>
        Object.fromEntries(
          Object.entries(current).filter(([id]) => !changed.has(id)),
        ) as AllocationReasons,
    );
    setAllocationValues(next);
    resetRequest();
  };
  const autoFill = () => {
    if (!finance.data) return;
    const result = autoAllocate(finance.data.orders, balanceMinor);
    setAllocationValues(result.values);
    setAllocationReasons(result.reasons);
    setOperationError(null);
    setConflictMessage(null);
    resetRequest();
  };
  const save = async () => {
    if (!finance.data || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setOperationError(null);
    try {
      const result = await createFinanceAllocationBatch({
        customerId: finance.data.customer.id,
        requestId: requestId.current,
        expectedRevision: finance.data.revision,
        comment: comment.trim() || undefined,
        allocations: Object.entries(allocationValues)
          .map(([orderGroupId, amount]) => ({
            orderGroupId: Number(orderGroupId),
            amount,
            amountMinor: parseRublesToMinor(amount) ?? 0,
          }))
          .filter((item) => item.amountMinor > 0)
          .map(({ orderGroupId, amount }) => ({ orderGroupId, amount })),
      });
      setConfirmOpen(false);
      setAllocationValues({});
      setAllocationReasons({});
      navigate(`/finance/allocations/${result.id}`);
    } catch (error) {
      setConfirmOpen(false);
      if (isAxiosError(error) && error.response?.status === 409) {
        await Promise.all([finance.mutate(), history.mutate()]);
        setAllocationValues({});
        setAllocationReasons({});
        setComment('');
        resetRequest();
        setConflictMessage(
          'Баланс или заказы были изменены другим пользователем. Данные обновлены — сформируйте распределение заново',
        );
      } else {
        setOperationError(
          'Не удалось сохранить распределение. Повторите попытку.',
        );
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };
  const openPayment = () => {
    if (!finance.data) return;
    setDialogAction({
      type: 'payment',
      customerId: finance.data.customer.id,
    });
  };

  if (isAxiosError(finance.error) && finance.error.response?.status === 404)
    return (
      <section className={styles.page}>
        <Empty description="Заказчик не найден">
          <Link to="/finance?tab=customers">Вернуться к финансам</Link>
        </Empty>
      </section>
    );

  return (
    <section className={styles.page}>
      <State
        loading={finance.isLoading}
        error={finance.error}
        retry={finance.mutate}
      >
        {finance.data ? (
          <Space className={styles.content} orientation="vertical" size="large">
            <div className={styles.header}>
              <div>
                <Link to="/finance?tab=customers">← Финансы</Link>
                <Typography.Title className={styles.title} level={2}>
                  {finance.data.customer.name}
                </Typography.Title>
                {(finance.data.customer.companyName ||
                  finance.data.customer.city) && (
                  <Typography.Text className={styles.muted}>
                    {[
                      finance.data.customer.companyName,
                      finance.data.customer.city,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Typography.Text>
                )}
              </div>
              <Button type="primary" onClick={openPayment}>
                Внести оплату
              </Button>
            </div>

            <div className={styles.summary}>
              <Card size="small">
                <Statistic
                  title="Текущий нераспределённый баланс"
                  value={formatMinor(Math.max(balanceMinor, 0))}
                  suffix="₽"
                />
              </Card>
              <Card size="small">
                <Statistic
                  title="Введено к распределению"
                  value={formatMinor(enteredMinor)}
                  suffix="₽"
                />
              </Card>
              <Card size="small">
                <Statistic
                  title="Останется после сохранения"
                  value={formatMinor(Math.max(balanceMinor - enteredMinor, 0))}
                  suffix="₽"
                />
              </Card>
            </div>

            {balanceMinor < 0 ? (
              <Alert
                showIcon
                type="warning"
                title={`Дефицит нераспределённого баланса: ${formatMinor(-balanceMinor)} ₽`}
                description="Распределение недоступно, пока баланс не станет положительным. Дефицит не относится к долгу по заказам."
              />
            ) : null}
            {conflictMessage ? (
              <Alert showIcon type="warning" title={conflictMessage} />
            ) : null}
            {operationError ? (
              <Alert showIcon type="error" title={operationError} />
            ) : null}

            <div>
              <Typography.Title className={styles.sectionTitle} level={4}>
                Распределение по заказам
              </Typography.Title>
              <State
                loading={false}
                error={undefined}
                empty={!finance.data.orders.length}
                emptyText="У заказчика пока нет заказов"
                retry={finance.mutate}
              >
                <CustomerAllocationTable
                  orders={finance.data.orders}
                  balance={finance.data.unallocatedBalance}
                  availableStatuses={finance.data.availableSystemStatuses}
                  values={allocationValues}
                  reasons={allocationReasons}
                  onChange={changeValues}
                  onAutoAllocate={autoFill}
                />
                <div className={styles.savePanel}>
                  <Input.TextArea
                    aria-label="Комментарий к распределению"
                    maxLength={1000}
                    placeholder="Комментарий (необязательно)"
                    value={comment}
                    onChange={(event) => {
                      setComment(event.target.value);
                      resetRequest();
                    }}
                  />
                  <Button
                    type="primary"
                    disabled={
                      enteredMinor <= 0 ||
                      balanceMinor <= 0 ||
                      hasAllocationErrors(
                        finance.data.orders,
                        allocationValues,
                        balanceMinor,
                      )
                    }
                    loading={submitting}
                    onClick={() => setConfirmOpen(true)}
                  >
                    Сохранить распределение
                  </Button>
                </div>
              </State>
            </div>

            <div>
              <Typography.Title className={styles.sectionTitle} level={4}>
                История
              </Typography.Title>
              <div className={styles.historyToolbar}>
                <Checkbox.Group
                  aria-label="Фильтр истории"
                  value={historyCategories}
                  options={[
                    { label: 'Оплаты', value: 'payments' },
                    { label: 'Распределения', value: 'allocations' },
                    {
                      label: 'Возвраты и аннулирования',
                      value: 'returns',
                    },
                    { label: 'Корректировки', value: 'adjustments' },
                  ]}
                  onChange={(values) => {
                    if (!values.length) return;
                    setHistoryCategories(values as HistoryCategory[]);
                    setHistoryCursor(undefined);
                    setHistoryBackStack([]);
                  }}
                />
                <Space>
                  <Button
                    disabled={!historyBackStack.length}
                    onClick={() => {
                      const previous = historyBackStack.at(-1);
                      setHistoryBackStack((stack) => stack.slice(0, -1));
                      setHistoryCursor(previous);
                    }}
                  >
                    Назад
                  </Button>
                  <Typography.Text>
                    Страница {historyBackStack.length + 1}
                  </Typography.Text>
                  <Button
                    disabled={!history.data?.meta.nextCursor}
                    onClick={() => {
                      const next = history.data?.meta.nextCursor;
                      if (!next) return;
                      setHistoryBackStack((stack) => [...stack, historyCursor]);
                      setHistoryCursor(next);
                    }}
                  >
                    Далее
                  </Button>
                </Space>
              </div>
              <State
                loading={history.isLoading}
                error={history.error}
                empty={!history.data?.items.length}
                emptyText="Финансовых операций пока нет"
                retry={history.mutate}
              >
                <Table<CustomerFinanceHistoryItem>
                  rowKey={(item) => `${item.type}-${item.id}`}
                  pagination={false}
                  scroll={{ x: 760 }}
                  dataSource={history.data?.items ?? []}
                  expandable={{
                    rowExpandable: (item) => item.details.length > 0,
                    expandedRowRender: (item) => (
                      <div className={styles.detail}>
                        {item.details.map((detail) => (
                          <span
                            key={`${detail.orderGroupId}-${detail.orderNumber}-${detail.amount}`}
                          >
                            {detail.orderNumber ?? 'Без заказа'}:{' '}
                            {formatFinanceMoney(detail.amount)}
                          </span>
                        ))}
                      </div>
                    ),
                  }}
                  columns={[
                    { title: 'Дата', dataIndex: 'createdAt', render: dateTime },
                    {
                      title: 'Тип',
                      dataIndex: 'type',
                      render: (type: CustomerFinanceHistoryType) =>
                        historyTypeLabels[type],
                    },
                    {
                      title: 'Операция',
                      render: (_, item) =>
                        item.operationId ? (
                          <Link to={`/finance/allocations/${item.operationId}`}>
                            {item.description}
                          </Link>
                        ) : (
                          item.description
                        ),
                    },
                    {
                      title: 'Сумма',
                      dataIndex: 'amount',
                      render: formatFinanceMoney,
                    },
                    {
                      title: 'Комментарий',
                      dataIndex: 'comment',
                      render: (value: string | null) => value ?? '—',
                    },
                    {
                      title: 'Сотрудник',
                      dataIndex: 'employee',
                      render: (value: string | null) => value ?? '—',
                    },
                  ]}
                />
              </State>
            </div>

            <FinanceMutationModals
              action={dialogAction}
              customers={[finance.data.customer]}
              onClose={() => setDialogAction(null)}
            />
            <Modal
              open={confirmOpen}
              title="Сохранить изменения?"
              okText="Сохранить"
              cancelText="Отмена"
              confirmLoading={submitting}
              onCancel={() => setConfirmOpen(false)}
              onOk={() => void save()}
            >
              Распределение будет сохранено одной операцией.
            </Modal>
          </Space>
        ) : null}
      </State>
    </section>
  );
};
