import {
  DownOutlined,
  EditOutlined,
  FileTextOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SettingOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { css } from '@emotion/css';
import {
  Alert,
  App,
  Breadcrumb,
  Button,
  Divider,
  Empty,
  Modal,
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
  useRecalculateOrderGroupProductionMutation,
} from '@entities/order';
import { ChangeOrderManagementForm } from '@features/change-order-management';
import { DATE_DEFAULT_FORMAT, useCurrentOrderGroupID } from '@shared/lib';
import { Field, NotFound, ServerError } from '@shared/ui';
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
    padding: 14px 16px 16px;
    border: 1px solid #303a46;
    border-radius: 8px;
    background: #141414;
  `,
  groupToolbar: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;

    @media (max-width: 900px) {
      flex-direction: column;
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
    min-width: 260px;
  `,
  groupName: css`
    margin-top: 4px;
    color: #8c8c8c;
    font-size: 14px;
  `,
  groupOverview: css`
    display: grid;
    flex: 1;
    grid-template-columns: repeat(2, minmax(180px, 1fr));
    gap: 8px 24px;
    padding-top: 2px;

    @media (max-width: 700px) {
      grid-template-columns: minmax(0, 1fr);
    }
  `,
  overviewItem: css`
    color: #8c8c8c;
    font-size: 14px;

    strong {
      color: #bfbfbf;
      font-weight: 400;
    }
  `,
  groupControls: css`
    display: flex;
    align-items: flex-end;
    flex-direction: column;
    gap: 12px;
    min-width: 260px;

    @media (max-width: 900px) {
      align-items: flex-start;
      width: 100%;
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
    .ant-typography {
      color: #8c8c8c;
      font-size: 14px;
    }
  `,
  groupDetailsTransition: css`
    display: grid;
    grid-template-rows: 1fr;
    opacity: 1;
    transition:
      grid-template-rows 200ms ease,
      opacity 200ms ease;

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `,
  groupDetailsCollapsed: css`
    grid-template-rows: 0fr;
    opacity: 0;
  `,
  groupDetailsContainer: css`
    min-height: 0;
    overflow: hidden;
  `,
  groupDetails: css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
    gap: 0 16px;
    padding-top: 14px;

    @media (max-width: 640px) {
      grid-template-columns: minmax(0, 1fr);
    }
  `,
  fullWidthField: css`
    grid-column: 1 / -1;
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
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = getOrderSection(searchParams);
  const { groupID } = useCurrentOrderGroupID();
  const {
    data: group,
    error: groupError,
    isLoading: isGroupLoading,
  } = useOrderGroupByIDWithOrderIDs(groupID);
  const recalculateProduction = useRecalculateOrderGroupProductionMutation(
    group?.id,
  );
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
  const [isGroupHeaderCollapsed, setIsGroupHeaderCollapsed] = useState(false);
  const groupTotal = useMemo(
    () =>
      documents.reduce(
        (total, document) => total + (Number(document.totalPrice) || 0),
        0,
      ),
    [documents],
  );

  const confirmProductionRecalculation = () => {
    if (!group || group.status === ORDER_STATUS.DRAFT) return;

    Modal.confirm({
      title: 'Пересчитать производственные работы?',
      content:
        'Сохранённые производственные данные всех позиций группы будут заменены.',
      okText: 'Пересчитать',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const result = await recalculateProduction.trigger();
          if (result.errors.length > 0) {
            message.error(
              `Перерасчёт отменён: ошибок в позициях — ${result.errors.length}`,
            );
            return;
          }
          message.success(`Обновлено позиций: ${result.updatedItems}`);
        } catch {
          message.error('Не удалось пересчитать производственные работы');
        }
      },
    });
  };

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
          <div className={styles.groupOverview}>
            <div className={styles.overviewItem}>
              Клиент: <strong>{group.customer?.name || '—'}</strong>
            </div>
            <div className={styles.overviewItem}>
              Начало производства:{' '}
              <strong>
                {group.startedAt
                  ? dayjs(group.startedAt).format(DATE_DEFAULT_FORMAT)
                  : '—'}
              </strong>
            </div>
            <div className={styles.overviewItem}>
              Документов: <strong>{documents.length}</strong>
            </div>
            <div className={styles.overviewItem}>
              Сумма: <strong>{formatCurrency(groupTotal)}</strong>
            </div>
            <div className={`${styles.overviewItem} ${styles.dueDate}`}>
              <ChangeOrderManagementForm
                field="dueDate"
                groupId={group.id}
                scope="group"
                targetId={group.id}
              />
            </div>
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
            <div className={styles.actions}>
              <OrderLifecycleActions
                groupId={group.id}
                managementVersion={group.managementVersion ?? 0}
                status={group.status}
              />
              <Button
                size="small"
                icon={<PrinterOutlined />}
                onClick={() => navigate(`/order/${group.id}/print`)}
              >
                Печать
              </Button>
              {group.status !== ORDER_STATUS.DRAFT && (
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  loading={recalculateProduction.isMutating}
                  onClick={confirmProductionRecalculation}
                >
                  Пересчитать работы
                </Button>
              )}
              <Link to={`/order/${group.id}/editing`}>
                <Button size="small" icon={<EditOutlined />}>
                  Редактировать
                </Button>
              </Link>
              <Button
                aria-expanded={!isGroupHeaderCollapsed}
                aria-label={
                  isGroupHeaderCollapsed
                    ? 'Развернуть комментарий заказа'
                    : 'Свернуть комментарий заказа'
                }
                size="small"
                icon={
                  isGroupHeaderCollapsed ? <DownOutlined /> : <UpOutlined />
                }
                onClick={() =>
                  setIsGroupHeaderCollapsed((isCollapsed) => !isCollapsed)
                }
              />
            </div>
          </div>
        </div>
        <div
          className={`${styles.groupDetailsTransition} ${
            isGroupHeaderCollapsed ? styles.groupDetailsCollapsed : ''
          }`}
        >
          <div className={styles.groupDetailsContainer}>
            <div className={styles.groupDetails}>
              <Field className={styles.fullWidthField}>
                <Field.Label>
                  <Typography.Text type="secondary">
                    Комментарий
                  </Typography.Text>
                </Field.Label>
                <Field.Value className={styles.fieldValue}>
                  <MarkdownPreview
                    className={styles.fieldText}
                    value={group.comment}
                  />
                </Field.Value>
              </Field>
            </div>
          </div>
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
