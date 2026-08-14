import { EditOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import {
  Alert,
  Breadcrumb,
  Button,
  Descriptions,
  Divider,
  Empty,
  Skeleton,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { type FC, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';

import {
  orderStatusColors,
  orderStatusLabels,
  useOrderByIDWithItems,
  useOrderGroupByIDWithOrderIDs,
} from '@entities/order';
import { DATE_DEFAULT_FORMAT, useCurrentOrderGroupID } from '@shared/lib';
import { NotFound, ServerError } from '@shared/ui';

import { useOrderDocuments } from '../api/useOrderDocuments';
import { formatCurrency } from '../model/orderInvoice';

import { OrderDocumentView } from './OrderDocumentView';

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
  groupHeader: css`
    margin-bottom: 12px;
    padding: 8px;
    background: var(--app-surface-1-background-color);
    border: 1px solid var(--app-devider-color);
    border-radius: 6px;
  `,
  groupTitle: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  `,
  groupTotal: css`
    white-space: nowrap;
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
      padding-top: 0;
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
      totalPrice: 0,
    }));
  }, [documentData?.items, group?.orderIds]);
  const [activeOrderID, setActiveOrderID] = useState<string>();
  const groupTotal = useMemo(
    () =>
      documents.reduce(
        (total, document) => total + (Number(document.totalPrice) || 0),
        0,
      ),
    [documents],
  );

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
          <Link to={`/order/${group.id}/editing`}>
            <Button size="small" icon={<EditOutlined />} type="text">
              Редактировать
            </Button>
          </Link>
        </div>
      </div>

      <div className={styles.groupHeader}>
        <div className={styles.groupTitle}>
          <div>
            <Tag color={orderStatusColors[group.status]}>
              {orderStatusLabels[group.status]}
            </Tag>
          </div>
          <div className={styles.groupTotal}>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {formatCurrency(groupTotal)}
            </Typography.Title>
          </div>
        </div>
        <Divider size="small" />
        <Descriptions
          column={{ xs: 1, sm: 2, lg: 3 }}
          size="small"
          items={[
            {
              key: 'customer',
              label: 'Заказчик',
              children: group.customer?.name || '—',
            },
            {
              key: 'startedAt',
              label: 'Дата заказа',
              children: group.startedAt
                ? dayjs(group.startedAt).format(DATE_DEFAULT_FORMAT)
                : '—',
            },
            {
              key: 'documents',
              label: 'Документов',
              children: documents.length,
            },
          ]}
        />
      </div>

      {documentsError && documents.length > 0 && (
        <Alert
          className={styles.alert}
          title="Названия документов временно недоступны"
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
                  title="Не удалось загрузить документ"
                  description="Обновите страницу или попробуйте выбрать документ ещё раз."
                  showIcon
                  type="error"
                />
              ) : (
                <OrderDocumentView order={order} />
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
