import { EditOutlined, PrinterOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import { Alert, Breadcrumb, Button, Empty, Skeleton, Tabs } from 'antd';
import { type FC, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';

import {
  useOrderByIDWithItems,
  useOrderGroupByIDWithOrderIDs,
} from '@entities/order';
import { useCurrentOrderGroupID } from '@shared/lib';
import { NotFound, ServerError } from '@shared/ui';

import { useOrderDocuments } from '../api/useOrderDocuments';

import { OrderInvoice } from './OrderInvoice';

const styles = {
  page: css`
    min-height: 100%;
    padding: 12px 16px 24px;

    @media (max-width: 640px) {
      padding: 10px 8px 18px;
    }
  `,
  topbar: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;

    @media (max-width: 640px) {
      align-items: flex-start;
      flex-direction: column;
    }
  `,
  actions: css`
    display: flex;
    gap: 8px;
  `,
  tabs: css`
    .ant-tabs-nav {
      margin-bottom: 0;
    }

    .ant-tabs-tab {
      padding-block: 5px !important;
      font-size: 12px;
    }

    .ant-tabs-content-holder {
      padding-top: 8px;
    }
  `,
  alert: css`
    margin-bottom: 8px;
  `,
  documentSkeleton: css`
    padding: 16px;
    background: var(--app-surface-1-background-color);
    border-radius: 6px;
  `,
  empty: css`
    padding: 40px 16px;
  `,
};

const hasHttpStatus = (error: Error, status: number): boolean =>
  'status' in error && error.status === status;

const OrderPage: FC = () => {
  const { groupID } = useCurrentOrderGroupID();
  const {
    data: group,
    error: groupError,
    isLoading: isGroupLoading,
  } = useOrderGroupByIDWithOrderIDs(groupID);
  const {
    data: documentData,
    error: documentsError,
    isLoading: areDocumentsLoading,
  } = useOrderDocuments(groupID);
  const documents = useMemo(() => {
    if (documentData?.items?.length) return documentData.items;

    return (group?.orderIds ?? []).map((id, index) => ({
      id,
      name: `Документ ${index + 1}`,
    }));
  }, [documentData?.items, group?.orderIds]);
  const [activeOrderID, setActiveOrderID] = useState<string>();

  useEffect(() => {
    if (!documents.some(({ id }) => id === activeOrderID)) {
      setActiveOrderID(documents[0]?.id);
    }
  }, [activeOrderID, documents]);

  const {
    data: order,
    error: orderError,
    isLoading: isOrderLoading,
  } = useOrderByIDWithItems({ id: activeOrderID });

  if (isGroupLoading) {
    return (
      <div className={styles.page}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (groupError && hasHttpStatus(groupError, 404)) {
    return <NotFound groupID={groupID === null ? null : String(groupID)} />;
  }

  if (!group || groupError) {
    return <ServerError />;
  }

  return (
    <section className={`${styles.page} order-view-page`}>
      <div className={`${styles.topbar} order-view-controls`}>
        <Breadcrumb
          items={[
            { title: <Link to="/">Заказы</Link> },
            { title: `Заказ № ${group.orderNumber}` },
          ]}
        />
        <div className={styles.actions}>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
            Печать
          </Button>
          <Link to={`/order/${group.id}/editing`}>
            <Button icon={<EditOutlined />} type="primary">
              Редактировать
            </Button>
          </Link>
        </div>
      </div>

      {documentsError && documents.length > 0 && (
        <Alert
          className={styles.alert}
          message="Названия документов временно недоступны"
          description="Документы можно просматривать по порядковым номерам."
          showIcon
          type="warning"
        />
      )}

      {areDocumentsLoading ? (
        <Skeleton.Input active block />
      ) : documents.length > 0 ? (
        <Tabs
          className={`${styles.tabs} order-view-tabs`}
          activeKey={activeOrderID}
          items={documents.map(({ id, name }, index) => ({
            key: id,
            label: name?.trim() || `Документ ${index + 1}`,
            children:
              id !== activeOrderID ? null : isOrderLoading ? (
                <div className={styles.documentSkeleton}>
                  <Skeleton active paragraph={{ rows: 8 }} />
                </div>
              ) : orderError || !order ? (
                <Alert
                  message="Не удалось загрузить документ"
                  description="Обновите страницу или попробуйте выбрать документ ещё раз."
                  showIcon
                  type="error"
                />
              ) : (
                <OrderInvoice group={group} order={order} />
              ),
          }))}
          onChange={setActiveOrderID}
          size="small"
          type="card"
        />
      ) : (
        <Empty
          className={styles.empty}
          description="В заказе пока нет документов"
        />
      )}
    </section>
  );
};

export default OrderPage;
