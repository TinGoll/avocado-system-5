import { css } from '@emotion/css';
import {
  Alert,
  Button,
  Empty,
  Input,
  Progress,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
} from 'antd';
import { type FC, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';

import {
  type FinanceCustomerListItem,
  type FinanceCustomerStatement,
  type FinanceStatementEntry,
  type FinanceTurnover,
  type FinanceTurnoverParams,
  type FinanceTurnoverRow,
  getFinanceCustomerStatement,
  getFinanceTurnover,
} from '@shared/api';

import { collectFinanceReport } from '../lib/collect-finance-report';
import { downloadFinanceReport } from '../lib/finance-report-workbook';
import {
  formatFinanceDate,
  formatFinanceMoney,
  paymentMethodLabel,
} from '../model/finance-display';

const styles = {
  filters: css`
    display: grid;
    grid-template-columns: repeat(4, minmax(160px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
    @media (max-width: 760px) {
      grid-template-columns: 1fr;
    }
  `,
  totals: css`
    display: grid;
    grid-template-columns: repeat(5, minmax(140px, 1fr));
    gap: 12px;
    margin: 16px 0;
    @media (max-width: 900px) {
      grid-template-columns: repeat(2, minmax(140px, 1fr));
    }
  `,
  footer: css`
    display: flex;
    justify-content: center;
    margin-top: 16px;
  `,
};

type ReportType = 'payments' | 'accruals' | 'statement';

type Props = {
  params: URLSearchParams;
  search: string;
  customers: FinanceCustomerListItem[];
  updateParam: (key: string, value?: string) => void;
};

const useReportPages = (
  type: ReportType,
  customerId: string | undefined,
  turnoverParams: FinanceTurnoverParams,
  dateFrom?: string,
  dateTo?: string,
) => {
  const key = [
    'finance/report',
    type,
    customerId ?? '',
    JSON.stringify(turnoverParams),
    dateFrom ?? '',
    dateTo ?? '',
  ] as const;
  const keySignature = key.join('|');
  const load = (cursor?: string) =>
    type === 'statement'
      ? getFinanceCustomerStatement(customerId!, {
          dateFrom,
          dateTo,
          cursor,
          limit: 50,
        })
      : getFinanceTurnover({ ...turnoverParams, cursor, limit: 50 });
  const { data, error, isLoading, mutate } = useSWR<
    FinanceTurnover | FinanceCustomerStatement
  >(type === 'statement' && !customerId ? null : key, () => load(), {
    keepPreviousData: true,
  });
  const [older, setOlder] = useState<
    Array<FinanceTurnoverRow | FinanceStatementEntry>
  >([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    setOlder([]);
    setNextCursor(null);
  }, [keySignature]);
  useEffect(() => setNextCursor(data?.meta.nextCursor ?? null), [data]);
  const items = useMemo(
    () => [...(data?.items ?? []), ...older],
    [data, older],
  );
  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await load(nextCursor);
      setOlder((current) => [
        ...current,
        ...(page.items as Array<FinanceTurnoverRow | FinanceStatementEntry>),
      ]);
      setNextCursor(page.meta.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };
  return {
    data,
    items,
    error,
    isLoading,
    mutate,
    loadingMore,
    nextCursor,
    loadMore,
  };
};

export const FinanceReports: FC<Props> = ({
  params,
  search,
  customers,
  updateParam,
}) => {
  const type = (params.get('reportType') ?? 'payments') as ReportType;
  const dateFrom = params.get('dateFrom') ?? undefined;
  const dateTo = params.get('dateTo') ?? undefined;
  const customerId = params.get('customerId') ?? undefined;
  const sourceType = params.get('sourceType') as 'order' | 'manual' | null;
  const method = params.get('method') as FinanceTurnoverParams['method'] | null;
  const status = params.get('reportStatus') ?? undefined;
  const allocationState = params.get('allocationState') as
    | FinanceTurnoverParams['allocationState']
    | null;
  const turnoverParams: FinanceTurnoverParams = {
    reportType: type === 'accruals' ? 'accruals' : 'payments',
    dateFrom,
    dateTo,
    customerId,
    search: search || undefined,
    sourceType: type === 'accruals' ? (sourceType ?? undefined) : undefined,
    method: type === 'payments' ? (method ?? undefined) : undefined,
    status,
    allocationState:
      type === 'payments' ? (allocationState ?? undefined) : undefined,
  };
  const report = useReportPages(
    type,
    customerId,
    turnoverParams,
    dateFrom,
    dateTo,
  );
  const [exporting, setExporting] = useState(false);
  const [exportedRows, setExportedRows] = useState(0);
  const [exportError, setExportError] = useState(false);
  const exportController = useRef<AbortController | null>(null);

  const exportAll = async () => {
    const controller = new AbortController();
    exportController.current = controller;
    setExporting(true);
    setExportError(false);
    setExportedRows(0);
    try {
      const document = await collectFinanceReport(
        type === 'statement'
          ? {
              type,
              customerId: customerId!,
              params: { dateFrom, dateTo },
            }
          : { type: 'turnover', params: turnoverParams },
        controller.signal,
        setExportedRows,
      );
      await downloadFinanceReport(document);
    } catch {
      if (!controller.signal.aborted) setExportError(true);
    } finally {
      setExporting(false);
      exportController.current = null;
    }
  };

  const totals = report.data?.totals;
  const statementTotals =
    type === 'statement'
      ? (totals as FinanceCustomerStatement['totals'] | undefined)
      : undefined;
  const turnoverTotals =
    type !== 'statement'
      ? (totals as FinanceTurnover['totals'] | undefined)
      : undefined;

  return (
    <div>
      <div className={styles.filters}>
        <Select
          aria-label="Тип отчёта"
          value={type}
          options={[
            { value: 'payments', label: 'Оплаты' },
            { value: 'accruals', label: 'Начисления' },
            { value: 'statement', label: 'Акт взаиморасчётов' },
          ]}
          onChange={(value) => updateParam('reportType', value)}
        />
        <Input
          aria-label="Дата начала отчёта"
          type="date"
          value={dateFrom ?? ''}
          onChange={(event) => updateParam('dateFrom', event.target.value)}
        />
        <Input
          aria-label="Дата окончания отчёта"
          type="date"
          value={dateTo ?? ''}
          onChange={(event) => updateParam('dateTo', event.target.value)}
        />
        <Select
          allowClear
          aria-label="Заказчик отчёта"
          placeholder="Все заказчики"
          value={customerId}
          options={customers.map((customer) => ({
            value: customer.id,
            label: customer.companyName ?? customer.name,
          }))}
          onChange={(value) => updateParam('customerId', value)}
        />
        {type === 'payments' && (
          <>
            <Select
              allowClear
              aria-label="Способ оплаты"
              placeholder="Все способы"
              value={method ?? undefined}
              options={Object.entries(paymentMethodLabel).map(
                ([value, label]) => ({ value, label }),
              )}
              onChange={(value) => updateParam('method', value)}
            />
            <Select
              allowClear
              aria-label="Распределение оплаты"
              placeholder="Любое распределение"
              value={allocationState ?? undefined}
              options={[
                { value: 'unallocated', label: 'Не распределено' },
                { value: 'partial', label: 'Частично' },
                { value: 'allocated', label: 'Распределено' },
              ]}
              onChange={(value) => updateParam('allocationState', value)}
            />
            <Select
              allowClear
              aria-label="Статус оплаты"
              placeholder="Все статусы"
              value={status}
              options={[
                { value: 'posted', label: 'Проведена' },
                { value: 'cancelled', label: 'Аннулирована' },
              ]}
              onChange={(value) => updateParam('reportStatus', value)}
            />
          </>
        )}
        {type === 'accruals' && (
          <>
            <Select
              allowClear
              aria-label="Источник начисления"
              placeholder="Все источники"
              value={sourceType ?? undefined}
              options={[
                { value: 'order', label: 'Заказ' },
                { value: 'manual', label: 'Вручную' },
              ]}
              onChange={(value) => updateParam('sourceType', value)}
            />
            <Select
              allowClear
              aria-label="Статус начисления"
              placeholder="Все статусы"
              value={status}
              options={[
                { value: 'active', label: 'Активно' },
                { value: 'cancelled', label: 'Аннулировано' },
              ]}
              onChange={(value) => updateParam('reportStatus', value)}
            />
          </>
        )}
      </div>
      {type === 'statement' && !customerId ? (
        <Empty description="Выберите заказчика для акта взаиморасчётов" />
      ) : report.isLoading ? (
        <Spin aria-label="Загрузка отчёта" />
      ) : report.error ? (
        <Alert
          showIcon
          type="error"
          title="Не удалось загрузить отчёт"
          action={
            <Button onClick={() => void report.mutate()}>Повторить</Button>
          }
        />
      ) : (
        <>
          <div className={styles.totals}>
            {(statementTotals
              ? [
                  ['Сальдо на начало', statementTotals.openingBalance],
                  ['Начислено', statementTotals.accrued],
                  ['Оплачено', statementTotals.paid],
                  ['Сальдо на конец', statementTotals.closingBalance],
                  [
                    'Нераспределённый аванс',
                    statementTotals.unallocatedAdvance,
                  ],
                ]
              : [
                  ['Операций', String(turnoverTotals?.count ?? 0)],
                  ['Итого', turnoverTotals?.amount ?? '0.00'],
                  ['Распределено', turnoverTotals?.allocated ?? '0.00'],
                  ['Не распределено', turnoverTotals?.unallocated ?? '0.00'],
                ]
            ).map(([label, value]) => (
              <Statistic
                key={label}
                title={label}
                value={value}
                suffix={label === 'Операций' ? undefined : '₽'}
              />
            ))}
          </div>
          <Table
            pagination={false}
            rowKey={(item) => `${item.kind}-${item.id}-${item.businessDate}`}
            scroll={{ x: 900 }}
            dataSource={report.items}
            locale={{ emptyText: 'За выбранный период операций нет' }}
            columns={
              type === 'statement'
                ? [
                    {
                      title: 'Дата',
                      dataIndex: 'businessDate',
                      render: formatFinanceDate,
                    },
                    { title: 'Операция', dataIndex: 'title' },
                    {
                      title: 'Начислено',
                      dataIndex: 'accrual',
                      render: formatFinanceMoney,
                    },
                    {
                      title: 'Оплачено',
                      dataIndex: 'payment',
                      render: formatFinanceMoney,
                    },
                    {
                      title: 'Изменение сальдо',
                      dataIndex: 'balanceChange',
                      render: formatFinanceMoney,
                    },
                  ]
                : type === 'payments'
                  ? [
                      {
                        title: 'Дата',
                        dataIndex: 'businessDate',
                        render: formatFinanceDate,
                      },
                      { title: 'Заказчик', dataIndex: 'customerName' },
                      { title: 'Способ', dataIndex: 'method' },
                      {
                        title: 'Сумма',
                        dataIndex: 'amount',
                        render: formatFinanceMoney,
                      },
                      {
                        title: 'Распределено',
                        dataIndex: 'allocated',
                        render: formatFinanceMoney,
                      },
                      {
                        title: 'Статус',
                        key: 'status',
                        render: (_, item) =>
                          item.kind === 'payment_cancellation'
                            ? 'Сторно'
                            : (item as FinanceTurnoverRow & { status: string })
                                .status,
                      },
                    ]
                  : [
                      {
                        title: 'Дата',
                        dataIndex: 'businessDate',
                        render: formatFinanceDate,
                      },
                      { title: 'Заказчик', dataIndex: 'customerName' },
                      { title: 'Заказ / услуга', dataIndex: 'title' },
                      { title: 'Операция', dataIndex: 'entryKind' },
                      {
                        title: 'Сумма',
                        dataIndex: 'amount',
                        render: formatFinanceMoney,
                      },
                    ]
            }
          />
          {report.nextCursor && (
            <div className={styles.footer}>
              <Button
                loading={report.loadingMore}
                onClick={() => void report.loadMore()}
              >
                Загрузить ещё
              </Button>
            </div>
          )}
          <Space wrap>
            <Button
              type="primary"
              disabled={exporting}
              onClick={() => void exportAll()}
            >
              Экспортировать XLSX
            </Button>
            {exporting && (
              <>
                <Progress
                  percent={100}
                  status="active"
                  showInfo={false}
                  aria-label="Экспорт отчёта"
                />
                <span>Получено строк: {exportedRows}</span>
                <Button onClick={() => exportController.current?.abort()}>
                  Отменить экспорт
                </Button>
              </>
            )}
          </Space>
          {exportError && (
            <Alert
              showIcon
              type="error"
              title="Не удалось экспортировать XLSX"
            />
          )}
        </>
      )}
    </div>
  );
};
