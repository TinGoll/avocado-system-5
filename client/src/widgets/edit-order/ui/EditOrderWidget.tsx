import { PlusOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import { App, Typography } from 'antd';
import { type FC, useState } from 'react';

import {
  useCopyOrderMutation,
  useOrdersMutations,
  useOrderStore,
} from '@entities/order';
import { AddOrderItemForm, OrderItemsList } from '@features/add-order-items';
import { CreateColorButton } from '@features/create-color';
import { CreateFacadePanelButton } from '@features/create-facade-panel';
import { CreateFacadeProfileButton } from '@features/create-facade-profile';
import { CreateMaterialButton } from '@features/create-material';
import { CreatePatinaButton } from '@features/create-patina';
import { CreateProductTemplatesButton } from '@features/create-production-templates';
import { CreateVarnishButton } from '@features/create-varnish';
import {
  AddOrderFieldsButton,
  EditOrderFields,
  RecalculateOrderPricesButton,
} from '@features/edit-order';
import { OrderTabs, orderTabsStore, Toolbar } from '@features/order-tabs';
import { useCurrentOrderGroupID } from '@shared/lib';

const styles = {
  documentFieldsTransition: css`
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
  documentFieldsCollapsed: css`
    grid-template-rows: 0fr;
    opacity: 0;
  `,
  documentFieldsContainer: css`
    min-height: 0;
    overflow: hidden;
  `,
};

export const EditOrderWidget: FC = () => {
  const { message } = App.useApp();
  const { groupID } = useCurrentOrderGroupID();
  const { create } = useOrdersMutations();
  const { currentOrder } = useOrderStore();
  const { addTab, currentTabKey: orderID, tabs } = orderTabsStore();
  const copyOrder = useCopyOrderMutation(orderID);
  const [creationMode, setCreationMode] = useState<'empty' | 'copy'>();
  const [isDocumentHeaderCollapsed, setIsDocumentHeaderCollapsed] =
    useState(false);
  const documentSummary =
    currentOrder && currentOrder.id === orderID
      ? [
          ['Материал', currentOrder.characteristics.material?.name],
          ['Цвет', currentOrder.characteristics.color?.name],
          ['Профиль', currentOrder.characteristics.profile?.name],
          ['Филёнка', currentOrder.characteristics.panel?.name],
          ['Патина', currentOrder.characteristics.patina?.name],
          ['Лак', currentOrder.characteristics.varnish?.name],
          ['Термошов', currentOrder.characteristics.thermalSeam],
          ['Присадка', currentOrder.characteristics.drilling],
        ]
          .filter((characteristic): characteristic is [string, string] =>
            Boolean(characteristic[1]),
          )
          .map(([label, value]) => `${label}: ${value}`)
          .join(', ')
      : '';

  const createDocument = async (copy = false) => {
    if (!groupID || creationMode) return;

    const fallbackName = `Документ ${tabs.length + 1}`;
    const sourceName = tabs.find((tab) => tab.key === orderID)?.label;
    const name = copy
      ? `Копия ${sourceName ?? currentOrder?.name ?? fallbackName}`
      : fallbackName;

    setCreationMode(copy ? 'copy' : 'empty');

    try {
      const order = copy
        ? await copyOrder.trigger({ name })
        : await create.trigger({
            name,
            orderGroupId: groupID,
            characteristics: {},
            items: [],
          });

      addTab({
        key: order.id,
        label: order.name ?? name,
        documentNumber: order.documentNumber,
      });
      message.success(copy ? 'Документ скопирован' : 'Документ создан');
    } catch {
      message.error(
        copy
          ? 'Не удалось скопировать документ'
          : 'Не удалось создать документ',
      );
    } finally {
      setCreationMode(undefined);
    }
  };

  return (
    <div>
      <OrderTabs
        isCreating={Boolean(creationMode)}
        onCreate={() => void createDocument()}
      />
      <Toolbar
        summary={
          isDocumentHeaderCollapsed && documentSummary ? (
            <Typography.Text strong>{documentSummary}</Typography.Text>
          ) : undefined
        }
        addFieldsAction={<AddOrderFieldsButton />}
        recalculatePricesAction={
          <RecalculateOrderPricesButton orderID={orderID} />
        }
        isCopyingOrder={creationMode === 'copy'}
        isFieldsCollapsed={isDocumentHeaderCollapsed}
        onCopyOrder={
          currentOrder?.id === orderID
            ? () => void createDocument(true)
            : undefined
        }
        onToggleFields={() =>
          setIsDocumentHeaderCollapsed((isCollapsed) => !isCollapsed)
        }
      />
      <div
        className={`${styles.documentFieldsTransition} ${
          isDocumentHeaderCollapsed ? styles.documentFieldsCollapsed : ''
        }`}
      >
        <div className={styles.documentFieldsContainer}>
          <EditOrderFields
            key={orderID}
            orderID={orderID}
            renderCreateColor={(onCreated) => (
              <CreateColorButton
                onCreated={onCreated}
                type="text"
                size="small"
                icon={<PlusOutlined />}
              />
            )}
            renderCreateMaterial={(onCreated) => (
              <CreateMaterialButton
                onCreated={onCreated}
                type="text"
                size="small"
                icon={<PlusOutlined />}
              />
            )}
            renderCreatePatina={(onCreated) => (
              <CreatePatinaButton
                onCreated={onCreated}
                type="text"
                size="small"
                icon={<PlusOutlined />}
              />
            )}
            renderCreateVarnish={(onCreated) => (
              <CreateVarnishButton
                onCreated={onCreated}
                type="text"
                size="small"
                icon={<PlusOutlined />}
              />
            )}
            renderCreateFacadeProfile={(onCreated) => (
              <CreateFacadeProfileButton
                onCreated={onCreated}
                type="text"
                size="small"
                icon={<PlusOutlined />}
              />
            )}
            renderCreateFacadePanel={(onCreated) => (
              <CreateFacadePanelButton
                onCreated={onCreated}
                type="text"
                size="small"
                icon={<PlusOutlined />}
              />
            )}
          />
        </div>
      </div>
      <AddOrderItemForm
        orderID={orderID ?? ''}
        createProductTemplateButton={
          <CreateProductTemplatesButton
            aria-label="Добавить номенклатуру"
            icon={<PlusOutlined />}
            type="text"
          />
        }
      />
      <OrderItemsList orderID={orderID ?? ''} />
    </div>
  );
};
