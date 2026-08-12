import { Tag } from 'antd';
import dayjs from 'dayjs';
import type { FC } from 'react';

import type { Order, OrderGroup, OrderStatus } from '@entities/order';
import { DATE_DEFAULT_FORMAT } from '@shared/lib';

import {
  formatCurrency,
  formatDimensions,
  orderStatusLabels,
  pricingMethodLabels,
} from '../model/orderInvoice';

import { invoiceStyles as styles } from './orderInvoice.styles';

type Props = {
  group: OrderGroup;
  order: Order;
};

const statusColors: Record<OrderStatus, string> = {
  draft: 'default',
  in_production: 'processing',
  completed: 'success',
  cancelled: 'error',
};

const getCharacteristicName = (value?: { name: string }): string =>
  value?.name || '—';

export const OrderInvoice: FC<Props> = ({ group, order }) => {
  const totalQuantity = order.items.reduce(
    (total, item) => total + (Number(item.quantity) || 0),
    0,
  );
  const documentName = order.name?.trim() || 'Документ заказа';
  const startedAt = group.startedAt ?? group.createdAt;

  const characteristics = [
    ['Материал', getCharacteristicName(order.characteristics.material)],
    ['Цвет', getCharacteristicName(order.characteristics.color)],
    ['Профиль', getCharacteristicName(order.characteristics.profile)],
    ['Филёнка', getCharacteristicName(order.characteristics.panel)],
    ['Патина', getCharacteristicName(order.characteristics.patina)],
    ['Лак', getCharacteristicName(order.characteristics.varnish)],
  ];

  return (
    <article className={`${styles.sheet} order-invoice-print-area`}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Товарная накладная</p>
          <h1 className={styles.title}>Заказ № {group.orderNumber}</h1>
          <div className={styles.documentName}>{documentName}</div>
        </div>
        <Tag className={styles.status} color={statusColors[group.status]}>
          {orderStatusLabels[group.status]}
        </Tag>
      </header>

      <section className={styles.meta} aria-label="Реквизиты заказа">
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Заказчик</span>
          <span className={styles.metaValue}>
            {group.customer?.name || '—'}
          </span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Дата заказа</span>
          <span className={styles.metaValue}>
            {startedAt ? dayjs(startedAt).format(DATE_DEFAULT_FORMAT) : '—'}
          </span>
        </div>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Документ</span>
          <span className={styles.metaValue}>{documentName}</span>
        </div>
      </section>

      <section className={styles.characteristics} aria-label="Характеристики">
        {characteristics.map(([label, value]) => (
          <div className={styles.characteristic} key={label}>
            <span className={styles.metaLabel}>{label}</span>
            <span className={styles.metaValue}>{value}</span>
          </div>
        ))}
      </section>

      {order.items.length > 0 ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">№</th>
                <th scope="col">Наименование</th>
                <th scope="col">Размеры</th>
                <th className={styles.numeric} scope="col">
                  Кол-во
                </th>
                <th scope="col">Ед.</th>
                <th className={styles.numeric} scope="col">
                  Цена за ед.
                </th>
                <th className={styles.numeric} scope="col">
                  Сумма
                </th>
                <th scope="col">Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => {
                const quantity = Number(item.quantity) || 0;
                const itemTotal = Number(item.calculatedCustomerPrice) || 0;

                return (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className={styles.product}>
                        {item.snapshot?.name || item.template?.name || '—'}
                      </div>
                      {item.template?.group && (
                        <div className={styles.productGroup}>
                          {item.template.group}
                        </div>
                      )}
                    </td>
                    <td>
                      {formatDimensions(
                        item.characteristics.width,
                        item.characteristics.height,
                        item.characteristics.thickness,
                      )}
                    </td>
                    <td className={styles.numeric}>{quantity}</td>
                    <td>
                      {pricingMethodLabels[item.snapshot.customerPricingMethod]}
                    </td>
                    <td className={styles.numeric}>
                      {formatCurrency(quantity > 0 ? itemTotal / quantity : 0)}
                    </td>
                    <td className={styles.numeric}>
                      {formatCurrency(itemTotal)}
                    </td>
                    <td className={styles.comment}>
                      {item.characteristics.comment || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={styles.empty}>В документе пока нет позиций</div>
      )}

      <footer className={styles.total}>
        <div className={styles.totalBox}>
          <span className={styles.totalLabel}>Позиций</span>
          <span className={styles.totalValue}>{order.items.length}</span>
          <span className={styles.totalLabel}>Количество изделий</span>
          <span className={styles.totalValue}>{totalQuantity}</span>
          <span className={styles.grandTotalLabel}>Итого</span>
          <span className={styles.grandTotalValue}>
            {formatCurrency(order.totalPrice)}
          </span>
        </div>
      </footer>
    </article>
  );
};
