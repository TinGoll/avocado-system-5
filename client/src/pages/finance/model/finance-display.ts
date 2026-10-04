export const paymentMethodLabel = {
  cash: 'Наличные',
  card: 'Карта',
  bank_transfer: 'Банковский перевод',
  other: 'Другое',
} as const;

export const accrualStateLabel = {
  unpaid: 'Не оплачено',
  partially_paid: 'Частично оплачено',
  paid: 'Оплачено',
  cancelled: 'Аннулировано',
} as const;

export const allocationStateLabel = {
  unallocated: 'Не распределено',
  partial: 'Частично распределено',
  allocated: 'Распределено',
} as const;

export const formatFinanceDate = (value: string) =>
  new Intl.DateTimeFormat('ru-RU').format(new Date(`${value}T00:00:00`));

export const formatFinanceMoney = (value: string) => `${value} ₽`;
