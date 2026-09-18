import {
  CalendarOutlined,
  CommentOutlined,
  DollarCircleOutlined,
  EditOutlined,
  FileTextOutlined,
  PrinterOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { css } from '@emotion/css';
import {
  Alert,
  Breadcrumb,
  Button,
  Divider,
  Empty,
  Skeleton,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { type FC, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';

import {
  ORDER_STATUS,
  orderStatusColors,
  orderStatusLabels,
  useOrderByIDWithItems,
  useOrderGroupByIDWithOrderIDs,
} from '@entities/order';
import { ChangeOrderManagementForm } from '@features/change-order-management';
import { DATE_DEFAULT_FORMAT, useCurrentOrderGroupID } from '@shared/lib';
import { NotFound, ServerError } from '@shared/ui';
import { MarkdownPreview } from '@shared/ui/markdown';

import { useOrderDocuments } from '../api/useOrderDocuments';
import { useOrderProduction } from '../api/useOrderProduction';
import { getCurrentProductionStatus } from '../model/currentProductionStatus';
import { formatCurrency } from '../model/orderInvoice';
import {
  getOrderSection,
  ORDER_SECTION,
  PRODUCTION_SECTION,
  setOrderSection,
} from '../model/orderSection';

import { OrderDocumentView } from './OrderDocumentView';
import { OrderLifecycleActions } from './OrderLifecycleActions';
import { OrderManagementHistory } from './OrderManagementHistory';
import { OrderProductionSummary } from './OrderProductionSummary';

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
    border: 1px solid #303a46;
    border-radius: 8px;
    background: #141414;

    @media (max-width: 640px) {
      padding: 8px;
    }
  `,
  groupToolbar: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #303a46;

    @media (max-width: 700px) {
      align-items: flex-start;
    }
  `,
  groupSummary: css`
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;

    > .ant-typography {
      flex: none;
      margin: 0;
      color: #f0f0f0;
      font-size: 20px;
      white-space: nowrap;
    }
  `,
  groupIdentity: css`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;

    @media (max-width: 700px) {
      align-items: flex-start;
      flex-direction: column;
      gap: 4px;
    }
  `,
  groupName: css`
    overflow: hidden;
    padding-left: 12px;
    border-left: 1px solid #303a46;
    color: #8996a3;
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;

    @media (max-width: 700px) {
      padding-left: 0;
      border-left: 0;
    }
  `,
  groupOverview: css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 8px;
    padding: 8px 0;

    @media (max-width: 1100px) {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }

    @media (max-width: 560px) {
      grid-template-columns: minmax(0, 1fr);
    }
  `,
  overviewItem: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 4px 8px;
    border: 1px solid #2d3841;
    border-radius: 8px;
  `,
  overviewIcon: css`
    display: grid;
    flex: 0 0 34px;
    width: 34px;
    height: 34px;
    place-items: center;
    border: 1px solid #2b353d;
    border-radius: 9px;
    color: #d9e0e5;
    background: linear-gradient(145deg, #283139, #1a2025);
    font-size: 16px;
  `,
  overviewContent: css`
    min-width: 0;
  `,
  overviewLabel: css`
    margin-bottom: 1px;
    overflow: hidden;
    color: #8794a0;
    font-size: 12px;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  overviewValue: css`
    overflow: hidden;
    color: #edf1f4;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
    text-overflow: ellipsis;
    white-space: nowrap;

    .ant-typography {
      color: inherit;
      font-size: inherit;
      font-weight: inherit;
    }
  `,
  groupControls: css`
    display: flex;
    align-items: center;
    gap: 10px;

    @media (max-width: 700px) {
      align-items: flex-end;
      flex-direction: column;
    }
  `,
  currentStatus: css`
    display: flex;
    align-items: center;
    gap: 10px;
    color: #8c8c8c;
    font-size: 13px;
  `,
  statusTag: css`
    margin-inline-end: 0;
    border-radius: 4px;
    font-weight: 500;
    white-space: nowrap;
  `,
  dueDate: css`
    overflow: visible;
  `,
  groupDetails: css`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 8px;
    border: 1px solid #303a46;
    border-radius: 8px;
  `,
  commentIcon: css`
    flex: none;
    margin-top: 2px;
    color: #91a0ac;
    font-size: 18px;
  `,
  commentLabel: css`
    flex: none;
    min-width: 124px;
    color: #8794a0;
    font-weight: 600;
  `,
  fieldText: css`
    min-width: 0;
    color: #d5dbe0;
    font-size: 14px;

    p:last-child {
      margin-bottom: 0;
    }
  `,
  actions: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-left: auto;
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
  sectionTabs: css`
    > .ant-tabs-nav {
      margin-bottom: 12px;
    }

    > .ant-tabs-nav .ant-tabs-tab {
      padding: 10px 20px;
      font-size: 14px;
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
  productionLayout: css`
    display: grid;
    grid-template-columns: minmax(0, 1fr) 512px;
    align-items: start;
    gap: 16px;

    @media (max-width: 1280px) {
      grid-template-columns: minmax(0, 1fr);
    }
  `,
};

const hasHttpStatus = (error: Error, status: number): boolean =>
  'status' in error && error.status === status;

const OrderPage: FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = getOrderSection(searchParams);
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
  const { data: productionData, isLoading: isProductionLoading } =
    useOrderProduction(groupID);
  const documents = useMemo(() => {
    if (documentData?.items?.length) {
      return [...documentData.items].sort(
        (first, second) => first.documentNumber - second.documentNumber,
      );
    }

    return (group?.orderIds ?? []).map((id, index) => ({
      id,
      name: `Документ ${index + 1}`,
      documentNumber: index + 1,
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
    const nextSearchParams = new URLSearchParams(searchParams);
    let shouldReplaceSearchParams = false;

    if (searchParams.get('tab') !== activeSection) {
      nextSearchParams.set('tab', activeSection);
      shouldReplaceSearchParams = true;
    }

    if (documents.length === 0) {
      if (shouldReplaceSearchParams) {
        setSearchParams(nextSearchParams, { replace: true });
      }
      return;
    }

    const requestedDocumentNumber = Number(searchParams.get('document'));
    const requestedDocument = documents.find(
      ({ documentNumber }) => documentNumber === requestedDocumentNumber,
    );
    const activeDocument =
      requestedDocument ??
      documents.find(({ id }) => id === activeOrderID) ??
      documents[0];

    if (activeDocument.id !== activeOrderID) {
      setActiveOrderID(activeDocument.id);
    }

    if (
      searchParams.get('document') !== String(activeDocument.documentNumber)
    ) {
      nextSearchParams.set('document', String(activeDocument.documentNumber));
      shouldReplaceSearchParams = true;
    }

    if (shouldReplaceSearchParams) {
      setSearchParams(nextSearchParams, { replace: true });
    }
  }, [activeOrderID, activeSection, documents, searchParams, setSearchParams]);

  const selectSection = (section: string) => {
    setSearchParams(setOrderSection(searchParams, getOrderSection(section)));
  };

  const selectDocument = (id: string) => {
    const document = documents.find((item) => item.id === id);
    setActiveOrderID(id);

    if (document) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set('document', String(document.documentNumber));
      setSearchParams(nextSearchParams);
    }
  };

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
          <OrderLifecycleActions
            groupId={group.id}
            managementVersion={group.managementVersion ?? 0}
            status={group.status}
          />
          {group.status !== ORDER_STATUS.DRAFT && (
            <Button
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => navigate(`/order/${group.id}/print`)}
            >
              Печать
            </Button>
          )}
          <Link to={`/order/${group.id}/editing`}>
            <Button size="small" icon={<EditOutlined />}>
              Редактировать
            </Button>
          </Link>
        </div>
      </div>

      <Tabs
        className={styles.sectionTabs}
        activeKey={activeSection}
        items={[
          {
            key: ORDER_SECTION,
            label: 'Заказ',
            icon: <FileTextOutlined />,
          },
          {
            key: PRODUCTION_SECTION,
            label: 'Производство и история',
            icon: <SettingOutlined />,
          },
        ]}
        onChange={selectSection}
      />

      <div className={styles.groupHeader}>
        <div className={styles.groupToolbar}>
          <div className={styles.groupIdentity}>
            <div className={styles.groupSummary}>
              <Typography.Title level={5}>Заказ №{group.id}</Typography.Title>
              <Divider type="vertical" />
              <ChangeOrderManagementForm
                field="status"
                groupId={group.id}
                hideLabel
                scope="group"
                targetId={group.id}
              />
            </div>
            <div className={styles.groupName}>{group.orderNumber || '—'}</div>
          </div>
          <div className={styles.groupControls}>
            <div className={styles.currentStatus}>
              Текущий статус:
              <Tag className={styles.statusTag} color="blue" variant="solid">
                {isProductionLoading
                  ? 'Загрузка...'
                  : getCurrentProductionStatus(productionData?.documents ?? [])}
              </Tag>
            </div>
          </div>
        </div>
        <div className={styles.groupOverview}>
          <div className={styles.overviewItem}>
            <div className={styles.overviewIcon}>
              <UserOutlined />
            </div>
            <div className={styles.overviewContent}>
              <div className={styles.overviewLabel}>Заказчик</div>
              <div className={styles.overviewValue}>
                {group.customer?.name || '—'}
              </div>
            </div>
          </div>
          <div className={styles.overviewItem}>
            <div className={styles.overviewIcon}>
              <CalendarOutlined />
            </div>
            <div className={styles.overviewContent}>
              <div className={styles.overviewLabel}>
                Дата начала производства
              </div>
              <div className={styles.overviewValue}>
                {group.startedAt
                  ? dayjs(group.startedAt).format(DATE_DEFAULT_FORMAT)
                  : '—'}
              </div>
            </div>
          </div>
          <div className={`${styles.overviewItem} ${styles.dueDate}`}>
            <div className={styles.overviewIcon}>
              <CalendarOutlined />
            </div>
            <div className={styles.overviewContent}>
              <div className={styles.overviewLabel}>Срок заказа</div>
              <div className={styles.overviewValue}>
                <ChangeOrderManagementForm
                  field="dueDate"
                  groupId={group.id}
                  hideLabel
                  scope="group"
                  targetId={group.id}
                />
              </div>
            </div>
          </div>
          <div className={styles.overviewItem}>
            <div className={styles.overviewIcon}>
              <FileTextOutlined />
            </div>
            <div className={styles.overviewContent}>
              <div className={styles.overviewLabel}>Документы</div>
              <div className={styles.overviewValue}>{documents.length}</div>
            </div>
          </div>
          <div className={styles.overviewItem}>
            <div className={styles.overviewIcon}>
              <DollarCircleOutlined />
            </div>
            <div className={styles.overviewContent}>
              <div className={styles.overviewLabel}>Сумма заказа</div>
              <div className={styles.overviewValue}>
                {formatCurrency(groupTotal)}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.groupDetails}>
          <CommentOutlined className={styles.commentIcon} />
          <div className={styles.commentLabel}>Комментарий</div>
          <MarkdownPreview className={styles.fieldText} value={group.comment} />
        </div>
      </div>

      {activeSection === ORDER_SECTION ? (
        <>
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
              items={documents.map(({ id, name, documentNumber }) => ({
                key: id,
                label: `№${documentNumber} · ${
                  name?.trim() || `Документ ${documentNumber}`
                }`,
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
                    <OrderDocumentView groupId={group.id} order={order} />
                  ),
              }))}
              onChange={selectDocument}
              size="small"
              type="card"
            />
          ) : (
            <Empty
              className={styles.empty}
              description="В заказе пока нет документов"
            />
          )}
        </>
      ) : (
        <div className={styles.productionLayout}>
          <OrderProductionSummary groupId={group.id} />
          <OrderManagementHistory groupId={group.id} />
        </div>
      )}
    </section>
  );
};

export default OrderPage;
