import { EditOutlined, PrinterOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import {
  Alert,
  Breadcrumb,
  Button,
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
import { Field, NotFound, ServerError } from '@shared/ui';

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
    border: 1px solid var(--app-devider-color);
    border-radius: 6px;
  `,
  groupToolbar: css`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    padding: 8px;
    border-bottom: 1px solid var(--app-devider-color);
    border-radius: 5px 5px 0 0;
    background: var(--app-body-2-background-color);
  `,
  groupDetails: css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
    gap: 0 16px;
    padding: 8px 8px 0;

    @media (max-width: 640px) {
      grid-template-columns: minmax(0, 1fr);
    }
  `,
  fieldValue: css`
    cursor: default;

    &:hover {
      box-shadow: none;
    }
  `,
  fieldText: css`
    font-size: 14px;
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
          <Tag variant="outlined" color={orderStatusColors[group.status]}>
            {orderStatusLabels[group.status]}
          </Tag>
        </div>
      </div>

      <div className={styles.groupHeader}>
        <div className={styles.groupToolbar}>
          <Button
            size="small"
            icon={<PrinterOutlined />}
            onClick={() => window.print()}
          >
            Печать
          </Button>
          <Link to={`/order/${group.id}/editing`}>
            <Button size="small" icon={<EditOutlined />}>
              Редактировать
            </Button>
          </Link>
        </div>
        <div className={styles.groupDetails}>
          <Field>
            <Field.Label>
              <Typography.Text type="secondary">Заказ №</Typography.Text>
            </Field.Label>
            <Field.Value className={styles.fieldValue}>
              <Typography.Text className={styles.fieldText} type="warning">
                {group.id}
              </Typography.Text>
            </Field.Value>
          </Field>
          <Field>
            <Field.Label>
              <Typography.Text type="secondary">
                Название заказа
              </Typography.Text>
            </Field.Label>
            <Field.Value className={styles.fieldValue}>
              <Typography.Text className={styles.fieldText} type="success">
                {group.orderNumber || '—'}
              </Typography.Text>
            </Field.Value>
          </Field>
          <Field>
            <Field.Label>
              <Typography.Text type="secondary">Заказчик</Typography.Text>
            </Field.Label>
            <Field.Value className={styles.fieldValue}>
              <Typography.Text className={styles.fieldText} type="success">
                {group.customer?.name || '—'}
              </Typography.Text>
            </Field.Value>
          </Field>
          <Field>
            <Field.Label>
              <Typography.Text type="secondary">
                Начало производства
              </Typography.Text>
            </Field.Label>
            <Field.Value className={styles.fieldValue}>
              <Typography.Text className={styles.fieldText} type="success">
                {group.startedAt
                  ? dayjs(group.startedAt).format(DATE_DEFAULT_FORMAT)
                  : '—'}
              </Typography.Text>
            </Field.Value>
          </Field>
          <Field>
            <Field.Label>
              <Typography.Text type="secondary">Документов</Typography.Text>
            </Field.Label>
            <Field.Value className={styles.fieldValue}>
              <Typography.Text className={styles.fieldText}>
                {documents.length}
              </Typography.Text>
            </Field.Value>
          </Field>
          <Field>
            <Field.Label>
              <Typography.Text type="secondary">Сумма</Typography.Text>
            </Field.Label>
            <Field.Value className={styles.fieldValue}>
              <Typography.Text className={styles.fieldText} strong>
                {formatCurrency(groupTotal)}
              </Typography.Text>
            </Field.Value>
          </Field>
        </div>
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
