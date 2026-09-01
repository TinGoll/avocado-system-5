import {
  ArrowLeftOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { css } from '@emotion/css';
import { Alert, Button, message, Skeleton, Tabs } from 'antd';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { type FC, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import useSWR from 'swr';

import { type Order, useOrderGroupByIDWithOrderIDs } from '@entities/order';
import { useCurrentOrderGroupID } from '@shared/lib';
import { fetcher } from '@shared/lib/swr';
import { NotFound, ServerError } from '@shared/ui';

import { exportOrderWorkbook } from '../lib/export-order-workbook';
import { buildProductionOrderDocuments } from '../model/production-order';

import { CustomerOrderPrintForm } from './CustomerOrderPrintForm';
import { ProductionOrderPrintForm } from './ProductionOrderPrintForm';

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
  actions: css`
    display: flex;
    gap: 8px;
  `,
  tabs: css`
    margin-top: 16px;

    && .ant-tabs-nav {
      position: sticky;
      top: 0;
      z-index: 1;
      margin-bottom: 0;
      background-color: var(--app-body-background-color);
    }

    && .ant-tabs-body-holder {
      box-sizing: border-box;
      padding: 12px;
      border: 1px solid var(--app-devider-color);
      border-top: 0;
      border-radius: 0 0 6px 6px;
    }
  `,
};

const hasHttpStatus = (error: Error, status: number): boolean =>
  'status' in error && error.status === status;

const OrderPrintPage: FC = () => {
  const navigate = useNavigate();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
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

  const productionDocuments = useMemo(
    () => buildProductionOrderDocuments(orders ?? []),
    [orders],
  );
  const hasItemsWithoutResults = useMemo(
    () =>
      orders?.some((order) =>
        order.items.some((item) => !item.productionOperationResults?.length),
      ) ?? false,
    [orders],
  );

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

  const exportToPdf = async () => {
    const documentElements = document.querySelectorAll<HTMLElement>(
      '[role="tabpanel"][aria-hidden="false"] .order-print-document',
    );

    if (!documentElements.length) {
      messageApi.error('Не удалось найти документ для экспорта');
      return;
    }

    setIsExporting(true);

    try {
      const pdf = new jsPDF({ format: 'a4', unit: 'mm' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let isFirstPage = true;

      for (const documentElement of documentElements) {
        const canvas = await html2canvas(documentElement, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
        });
        const imageHeight = (canvas.height * pageWidth) / canvas.width;
        const image = canvas.toDataURL('image/jpeg', 0.95);
        const pageCount = Math.max(
          1,
          Math.ceil((imageHeight - 0.5) / pageHeight),
        );

        for (let page = 0; page < pageCount; page += 1) {
          if (!isFirstPage) pdf.addPage();
          pdf.addImage(
            image,
            'JPEG',
            0,
            -page * pageHeight,
            pageWidth,
            imageHeight,
          );
          isFirstPage = false;
        }
      }

      pdf.save(`order-${group.id}.pdf`);
    } catch {
      messageApi.error('Не удалось экспортировать документ в PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const tabs = [
    {
      key: 'customer',
      label: 'Бланк для заказчика',
      children: (
        <div>
          {(orders ?? []).map((document, documentIndex) => (
            <CustomerOrderPrintForm
              key={document.id}
              order={group}
              document={document}
              documentCount={orders?.length ?? 0}
              documentIndex={documentIndex}
            />
          ))}
        </div>
      ),
    },
    {
      key: 'general-production',
      label: 'Общий заказ',
      children: (
        <div>
          {(orders ?? []).map((document, documentIndex) => (
            <CustomerOrderPrintForm
              key={document.id}
              order={group}
              document={document}
              documentCount={orders?.length ?? 0}
              documentIndex={documentIndex}
              showPrices={false}
            />
          ))}
        </div>
      ),
    },
    ...productionDocuments.map((document) => ({
      key: document.operationId,
      label: document.operationName,
      children: (
        <ProductionOrderPrintForm
          group={group}
          document={document}
          documentCount={orders?.length ?? 0}
        />
      ),
    })),
  ];

  const exportToExcel = async () => {
    setIsExportingExcel(true);

    try {
      await exportOrderWorkbook({
        group,
        orders: orders ?? [],
        productionDocuments,
      });
    } catch {
      messageApi.error('Не удалось экспортировать документ в Excel');
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <section className={`${styles.page} order-print-page`}>
      {messageContextHolder}
      <div className={`${styles.toolbar} order-print-controls`}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          Вернуться назад
        </Button>
        <div className={styles.actions}>
          <Button
            icon={<FileExcelOutlined />}
            loading={isExportingExcel}
            onClick={exportToExcel}
          >
            Экспорт в Excel
          </Button>
          <Button
            icon={<FilePdfOutlined />}
            loading={isExporting}
            onClick={exportToPdf}
          >
            Экспорт в PDF
          </Button>
          <Button
            icon={<PrinterOutlined />}
            type="primary"
            onClick={() => window.print()}
          >
            Печать
          </Button>
        </div>
      </div>
      {hasItemsWithoutResults && (
        <Alert
          title="Не для всех позиций рассчитаны работы"
          description="Выполните ручной перерасчёт группы заказов, чтобы сформировать полный производственный бланк-наряд."
          showIcon
          type="warning"
        />
      )}
      <Tabs className={styles.tabs} items={tabs} type="card" />
    </section>
  );
};

export default OrderPrintPage;
