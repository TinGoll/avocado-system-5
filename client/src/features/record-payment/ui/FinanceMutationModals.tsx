import { css } from '@emotion/css';
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Typography,
} from 'antd';
import { isAxiosError } from 'axios';
import dayjs, { type Dayjs } from 'dayjs';
import { type FC, useEffect, useMemo, useRef, useState } from 'react';

import {
  type FinanceAccrual,
  type FinanceCustomerListItem,
  type FinancePayment,
  getFinanceAccruals,
  getFinancePayment,
} from '@shared/api';

import { useFinanceMutations } from '../api/finance-mutations';
import {
  FinanceRequestAttempt,
  calculatePaymentTotals,
  minorToRubles,
  rublesToMinor,
} from '../model/finance-attempt';

export type FinanceDialogAction =
  | { type: 'manual-accrual' }
  | {
      type: 'payment';
      customerId?: string;
      initialAllocation?: { accrualId: string; amount: string };
    }
  | { type: 'create-order-accrual'; orderGroupId: number }
  | { type: 'allocations'; payment: FinancePayment }
  | { type: 'cancel-payment'; payment: FinancePayment }
  | { type: 'sync-accrual'; accrual: FinanceAccrual }
  | { type: 'adjust-accrual'; accrual: FinanceAccrual }
  | { type: 'cancel-accrual'; accrual: FinanceAccrual };

type AllocationValue = { accrualId: string; amount: string };
type FinanceFormValues = {
  customerId: string;
  title: string;
  amount: string;
  date: Dayjs;
  method: FinancePayment['method'];
  externalReference?: string;
  comment?: string;
  reason?: string;
  allocations?: AllocationValue[];
  confirmAdvance?: boolean;
  confirmAction?: boolean;
};

const styles = {
  totals: css`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    padding: 12px;
    border: 1px solid rgba(127, 127, 127, 0.25);
    border-radius: 8px;
  `,
  allocation: css`
    display: grid;
    grid-template-columns: minmax(0, 1fr) 140px auto;
    gap: 8px;
    align-items: start;
    @media (max-width: 600px) {
      grid-template-columns: 1fr;
    }
  `,
};

const today = () => dayjs().startOf('day');
const isConflict = (error: unknown) =>
  isAxiosError(error) && error.response?.status === 409;

export const FinanceMutationModals: FC<{
  action: FinanceDialogAction | null;
  customers: FinanceCustomerListItem[];
  onClose: () => void;
}> = ({ action, customers, onClose }) => {
  const [form] = Form.useForm<FinanceFormValues>();
  const mutations = useFinanceMutations();
  const attempt = useRef(new FinanceRequestAttempt());
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [conflict, setConflict] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [freshVersion, setFreshVersion] = useState<number | null>(null);
  const customerId = Form.useWatch('customerId', form);
  const amount = Form.useWatch('amount', form);
  const watchedAllocations = Form.useWatch('allocations', form);
  const selectedCustomer =
    customerId ??
    (action?.type === 'payment' ? action.customerId : undefined) ??
    (action && 'payment' in action ? action.payment.customerId : undefined) ??
    (action && 'accrual' in action ? action.accrual.customerId : undefined);
  const [activeAccruals, setActiveAccruals] = useState<FinanceAccrual[]>([]);
  const [releasedHistory, setReleasedHistory] = useState<
    Array<{ id: string; amount: string; releaseReason: string | null }>
  >([]);

  const { amountMinor, allocatedMinor, advanceMinor } = useMemo(
    () => calculatePaymentTotals(amount, watchedAllocations),
    [amount, watchedAllocations],
  );

  const loadAccruals = async (id?: string) => {
    if (!id) return setActiveAccruals([]);
    const page = await getFinanceAccruals({ customerId: id, limit: 100 });
    setActiveAccruals(
      page.items.filter(
        (item) => item.status === 'active' && item.remainingMinor > 0,
      ),
    );
  };

  useEffect(() => {
    if (!action) return;
    setConflict(false);
    setOperationError(null);
    setFreshVersion(null);
    attempt.current.changePayload();
    form.resetFields();
    form.setFieldsValue({ date: today(), method: 'bank_transfer' });
    if (action.type === 'payment' && action.customerId) {
      form.setFieldsValue({
        customerId: action.customerId,
        amount: action.initialAllocation?.amount,
        allocations: action.initialAllocation ? [action.initialAllocation] : [],
      });
      void loadAccruals(action.customerId);
    }
    if ('payment' in action) {
      void loadAccruals(action.payment.customerId);
    }
    if (action.type === 'allocations') {
      void getFinancePayment(action.payment.id).then((detail) => {
        form.setFieldsValue({
          allocations: detail.allocations
            .filter((item) => item.status === 'active')
            .map((item) => ({
              accrualId: item.accrualId,
              amount: item.amount,
            })),
        });
        setReleasedHistory(
          detail.allocations
            .filter((item) => item.status === 'released')
            .map((item) => ({
              id: item.id,
              amount: item.amount,
              releaseReason: item.releaseReason,
            })),
        );
      });
    } else {
      setReleasedHistory([]);
    }
  }, [action, form]);

  const close = () => {
    form.resetFields();
    setConflict(false);
    setOperationError(null);
    setFreshVersion(null);
    setActiveAccruals([]);
    onClose();
  };

  const refreshConflictTarget = async () => {
    if (!action) return;
    if ('payment' in action) {
      const fresh = await getFinancePayment(action.payment.id);
      setFreshVersion(fresh.version);
    } else if ('accrual' in action) {
      const page = await getFinanceAccruals({
        customerId: action.accrual.customerId,
        limit: 100,
      });
      setFreshVersion(
        page.items.find((item) => item.id === action.accrual.id)?.version ??
          null,
      );
    }
    setConflict(true);
  };

  const submit = async (values: FinanceFormValues) => {
    if (!action || submittingRef.current) return;
    const submittedAllocated = (values.allocations ?? []).reduce(
      (sum, item) => sum + rublesToMinor(item?.amount),
      0,
    );
    if (
      action.type === 'payment' &&
      submittedAllocated > rublesToMinor(values.amount)
    ) {
      form.setFields([
        {
          name: 'allocations',
          errors: ['Распределение не может превышать сумму оплаты'],
        },
      ]);
      return;
    }
    if (
      action.type === 'allocations' &&
      submittedAllocated > action.payment.amountMinor
    ) {
      form.setFields([
        {
          name: 'allocations',
          errors: ['Распределение не может превышать сумму оплаты'],
        },
      ]);
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setConflict(false);
    setOperationError(null);
    try {
      const date = values.date.format('YYYY-MM-DD');
      if (action.type === 'manual-accrual') {
        await mutations.createManualAccrual({
          customerId: values.customerId,
          title: values.title.trim(),
          amount: values.amount,
          effectiveDate: date,
          reason: values.reason?.trim() || undefined,
          requestId: attempt.current.current(),
        });
      } else if (action.type === 'create-order-accrual') {
        await mutations.createOrderAccrual({
          orderGroupId: action.orderGroupId,
          effectiveDate: date,
          requestId: attempt.current.current(),
        });
      } else if (action.type === 'payment') {
        await mutations.createFinancePayment({
          customerId: values.customerId,
          amount: values.amount,
          paymentDate: date,
          method: values.method,
          externalReference: values.externalReference?.trim() || undefined,
          comment: values.comment?.trim() || undefined,
          allocations: (values.allocations ?? []).filter(
            (item) => item?.accrualId && item.amount,
          ),
          requestId: attempt.current.current(),
        });
      } else if (action.type === 'allocations') {
        await mutations.replaceFinanceAllocations(action.payment.id, {
          allocations: values.allocations ?? [],
          expectedVersion: freshVersion ?? action.payment.version,
          reason: values.reason?.trim() || undefined,
        });
      } else if (action.type === 'cancel-payment') {
        await mutations.cancelFinancePayment(action.payment.id, {
          cancellationDate: date,
          reason: values.reason!.trim(),
          expectedVersion: freshVersion ?? action.payment.version,
          requestId: attempt.current.current(),
        });
      } else if (action.type === 'sync-accrual') {
        await mutations.syncFinanceAccrual(action.accrual.id, {
          effectiveDate: date,
          expectedVersion: freshVersion ?? action.accrual.version,
          requestId: attempt.current.current(),
        });
      } else if (action.type === 'adjust-accrual') {
        await mutations.adjustFinanceAccrual(action.accrual.id, {
          amount: values.amount,
          effectiveDate: date,
          reason: values.reason!.trim(),
          expectedVersion: freshVersion ?? action.accrual.version,
          requestId: attempt.current.current(),
        });
      } else {
        await mutations.cancelFinanceAccrual(action.accrual.id, {
          effectiveDate: date,
          reason: values.reason!.trim(),
          expectedVersion: freshVersion ?? action.accrual.version,
          requestId: attempt.current.current(),
        });
      }
      await mutations.invalidate();
      attempt.current.changePayload();
      close();
    } catch (error) {
      if (isConflict(error)) {
        await refreshConflictTarget();
      } else {
        setOperationError(
          isAxiosError<{ message?: string }>(error)
            ? (error.response?.data?.message ??
                'Не удалось выполнить операцию. Проверьте данные и повторите попытку.')
            : 'Не удалось выполнить операцию. Повторите попытку.',
        );
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const isPayment = action?.type === 'payment';
  const isAllocation = action?.type === 'allocations';
  const isManual = action?.type === 'manual-accrual';
  const needsConfirmation =
    action?.type === 'cancel-payment' || action?.type === 'cancel-accrual';
  const needsAmount =
    isPayment || isManual || action?.type === 'adjust-accrual';
  const needsReason =
    isManual ||
    isAllocation ||
    action?.type === 'cancel-payment' ||
    action?.type === 'adjust-accrual' ||
    action?.type === 'cancel-accrual';
  const title =
    action?.type === 'manual-accrual'
      ? 'Новое начисление'
      : action?.type === 'create-order-accrual'
        ? 'Создать начисление заказа'
        : action?.type === 'payment'
          ? 'Новая оплата'
          : action?.type === 'allocations'
            ? 'Распределение оплаты'
            : action?.type === 'cancel-payment'
              ? 'Аннулировать оплату'
              : action?.type === 'sync-accrual'
                ? 'Обновить сумму заказа'
                : action?.type === 'adjust-accrual'
                  ? 'Корректировка начисления'
                  : 'Аннулировать начисление';

  return (
    <Modal
      destroyOnHidden
      open={Boolean(action)}
      title={title}
      okText="Сохранить"
      cancelText="Отмена"
      confirmLoading={submitting}
      onCancel={close}
      onOk={() => void form.submit()}
    >
      {conflict && (
        <Alert
          showIcon
          type="warning"
          title="Данные изменились на сервере"
          description={
            freshVersion === null
              ? 'Не удалось получить свежую версию. Закройте форму и повторите действие.'
              : 'Черновик сохранён. Нажмите «Сохранить», чтобы применить его к свежим данным.'
          }
        />
      )}
      {operationError && <Alert showIcon type="error" title={operationError} />}
      <Form<FinanceFormValues>
        form={form}
        layout="vertical"
        initialValues={{
          date: today(),
          method: 'bank_transfer',
          allocations: [],
        }}
        onFinish={(values) => void submit(values)}
        onValuesChange={(changed) => {
          attempt.current.changePayload();
          if ('customerId' in changed) void loadAccruals(changed.customerId);
        }}
      >
        {(isManual || isPayment) && (
          <Form.Item
            name="customerId"
            label="Заказчик"
            rules={[{ required: true, message: 'Выберите заказчика' }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={customers.map((item) => ({
                value: item.id,
                label: item.companyName ?? item.name,
              }))}
            />
          </Form.Item>
        )}
        {isManual && (
          <Form.Item name="title" label="Услуга" rules={[{ required: true }]}>
            <Input maxLength={500} />
          </Form.Item>
        )}
        {needsAmount && (
          <Form.Item name="amount" label="Сумма" rules={[{ required: true }]}>
            <Input inputMode="decimal" placeholder="0.00" />
          </Form.Item>
        )}
        <Form.Item name="date" label="Дата" rules={[{ required: true }]}>
          <DatePicker format="DD.MM.YYYY" />
        </Form.Item>
        {isPayment && (
          <>
            <Form.Item name="method" label="Способ оплаты">
              <Select
                options={[
                  { value: 'cash', label: 'Наличные' },
                  { value: 'card', label: 'Карта' },
                  { value: 'bank_transfer', label: 'Банковский перевод' },
                  { value: 'other', label: 'Другое' },
                ]}
              />
            </Form.Item>
            <Form.Item name="externalReference" label="Внешний номер">
              <Input maxLength={500} />
            </Form.Item>
            <Form.Item name="comment" label="Комментарий">
              <Input.TextArea maxLength={1000} />
            </Form.Item>
          </>
        )}
        {(isPayment || isAllocation) && (
          <Form.List name="allocations">
            {(fields, { add, remove }) => (
              <Space orientation="vertical" size="small">
                <Typography.Text strong>Распределение</Typography.Text>
                {fields.map(({ key, ...field }) => (
                  <div className={styles.allocation} key={key}>
                    <Form.Item
                      {...field}
                      name={[field.name, 'accrualId']}
                      rules={[{ required: true }]}
                    >
                      <Select
                        placeholder="Начисление"
                        options={activeAccruals.map((item) => ({
                          value: item.id,
                          label: `${item.title} — остаток ${item.remaining}`,
                        }))}
                      />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'amount']}
                      rules={[{ required: true }]}
                    >
                      <Input placeholder="0.00" inputMode="decimal" />
                    </Form.Item>
                    <Button onClick={() => remove(field.name)}>Удалить</Button>
                  </div>
                ))}
                <Button
                  disabled={!selectedCustomer}
                  onClick={() => {
                    if (!activeAccruals.length)
                      void loadAccruals(selectedCustomer);
                    add();
                  }}
                >
                  Добавить начисление
                </Button>
              </Space>
            )}
          </Form.List>
        )}
        {isAllocation && releasedHistory.length > 0 && (
          <Alert
            type="info"
            title="История освобождений"
            description={releasedHistory.map((item) => (
              <div key={item.id}>
                {item.amount} ₽ — {item.releaseReason ?? 'Причина не указана'}
              </div>
            ))}
          />
        )}
        {isPayment && (
          <>
            <div className={styles.totals}>
              <span>Сумма: {minorToRubles(amountMinor)} ₽</span>
              <span>Распределено: {minorToRubles(allocatedMinor)} ₽</span>
              <span>Останется авансом: {minorToRubles(advanceMinor)} ₽</span>
            </div>
            {allocatedMinor > amountMinor && (
              <Alert
                showIcon
                type="error"
                title="Распределение превышает сумму оплаты"
              />
            )}
            {advanceMinor > 0 && (
              <Form.Item
                name="confirmAdvance"
                valuePropName="checked"
                rules={[
                  {
                    validator: (_, value) =>
                      value
                        ? Promise.resolve()
                        : Promise.reject(
                            new Error('Подтвердите нераспределенный аванс'),
                          ),
                  },
                ]}
              >
                <Checkbox>Подтверждаю остаток оплаты как аванс</Checkbox>
              </Form.Item>
            )}
          </>
        )}
        {needsReason && (
          <Form.Item
            name="reason"
            label="Причина"
            rules={
              isManual ? [] : [{ required: true, message: 'Укажите причину' }]
            }
          >
            <Input.TextArea maxLength={1000} />
          </Form.Item>
        )}
        {needsConfirmation && (
          <Form.Item
            name="confirmAction"
            valuePropName="checked"
            rules={[
              {
                validator: (_, value) =>
                  value
                    ? Promise.resolve()
                    : Promise.reject(new Error('Подтвердите аннулирование')),
              },
            ]}
          >
            <Checkbox>Подтверждаю аннулирование операции</Checkbox>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};
