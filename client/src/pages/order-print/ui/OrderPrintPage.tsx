import { ArrowLeftOutlined, PrinterOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import { Alert, Button, Skeleton, Tabs, Typography } from 'antd';
import { type FC, useMemo } from 'react';
import { useNavigate } from 'react-router';
import useSWR from 'swr';

import { type Order, useOrderGroupByIDWithOrderIDs } from '@entities/order';
import { useCurrentOrderGroupID } from '@shared/lib';
import { fetcher } from '@shared/lib/swr';
import { NotFound, ServerError } from '@shared/ui';

const styles = {
  page: css`
    min-height: 100%;
    padding: 16px;
  `,
  toolbar: css`
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  `,
  preview: css`
    box-sizing: border-box;
    width: min(210mm, 100%);
    min-height: 297mm;
    margin: 0 auto;
    padding: 20mm;
    overflow: auto;
    color: #111;
    background: #fff;
    box-shadow: 0 2px 16px rgb(0 0 0 / 25%);
  `,
  data: css`
    margin: 16px 0 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font: 12px/1.5 monospace;
  `,
};

const hasHttpStatus = (error: Error, status: number): boolean =>
  'status' in error && error.status === status;

type PrintDocumentProps = {
  title: string;
  data: unknown;
};

const PrintDocument: FC<PrintDocumentProps> = ({ title, data }) => (
  <article className={`${styles.preview} order-print-document`}>
    <Typography.Title level={2}>{title}</Typography.Title>
    <pre className={styles.data}>{JSON.stringify(data, null, 2)}</pre>
  </article>
);

const OrderPrintPage: FC = () => {
  const navigate = useNavigate();
  const { groupID } = useCurrentOrderGroupID();
  const {
    data: group,
    error: groupError,
    isLoading: isGroupLoading,
  } = useOrderGroupByIDWithOrderIDs(groupID);
  const orderIDs = group?.orderIds ?? [];
  const {
    data: orders,
    error: ordersError,
    isLoading: areOrdersLoading,
  } = useSWR<Order[]>(
    orderIDs.length ? ['order-print', ...orderIDs] : null,
    () =>
      Promise.all(
        orderIDs.map((id) =>
          fetcher<Order>({ url: `orders/${id}/with-items` }),
        ),
      ),
  );

  const operations = useMemo(() => {
    const uniqueOperations = new Map<
      string,
      NonNullable<Order['items'][number]['template']['operations']>[number]
    >();

    orders?.forEach((order) =>
      order.items.forEach((item) =>
        item.template.operations?.forEach((operation) =>
          uniqueOperations.set(operation.id, operation),
        ),
      ),
    );

    return [...uniqueOperations.values()];
  }, [orders]);

  if (isGroupLoading || (orderIDs.length > 0 && areOrdersLoading)) {
    return (
      <div className={styles.page}>
        <Skeleton active paragraph={{ rows: 12 }} />
      </div>
    );
  }

  if (groupError && hasHttpStatus(groupError, 404)) {
    return <NotFound groupID={groupID === null ? null : String(groupID)} />;
  }

  if (!group || groupError || ordersError) return <ServerError />;

  const tabs = [
    {
      key: 'customer',
      label: 'Бланк для заказчика',
      children: (
        <PrintDocument
          title="Бланк для заказчика"
          data={{ order: group, documents: orders ?? [] }}
        />
      ),
    },
    ...operations.map((operation) => ({
      key: operation.id,
      label: operation.name,
      children: (
        <PrintDocument
          title={`Бланк-наряд: ${operation.name}`}
          data={{
            order: group,
            operation,
            documents: (orders ?? []).map((order) => ({
              ...order,
              items: order.items.filter((item) =>
                item.template.operations?.some(({ id }) => id === operation.id),
              ),
            })),
          }}
        />
      ),
    })),
  ];

  return (
    <section className={`${styles.page} order-print-page`}>
      <div className={`${styles.toolbar} order-print-controls`}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Вернуться назад
        </Button>
        <Button
          icon={<PrinterOutlined />}
          type="primary"
          onClick={() => window.print()}
        >
          Печать
        </Button>
      </div>
      {operations.length === 0 && (
        <Alert
          title="В заказе пока нет работ"
          description="Доступен только бланк для заказчика. Вкладки бланков-нарядов появятся автоматически после добавления работ."
          showIcon
          type="info"
        />
      )}
      <Tabs className={css`
        margin-top: 16px;
      `} items={tabs} type="card" />
    </section>
  );
};

export default OrderPrintPage;
