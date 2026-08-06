import { PlusOutlined } from '@ant-design/icons';
import { App } from 'antd';
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
import { AddOrderFieldsButton, EditOrderFields } from '@features/edit-order';
import { OrderTabs, orderTabsStore, Toolbar } from '@features/order-tabs';
import { useCurrentOrderGroupID } from '@shared/lib';

export const EditOrderWidget: FC = () => {
  const { message } = App.useApp();
  const { groupID } = useCurrentOrderGroupID();
  const { create } = useOrdersMutations();
  const { currentOrder } = useOrderStore();
  const { addTab, currentTabKey: orderID, tabs } = orderTabsStore();
  const copyOrder = useCopyOrderMutation(orderID);
  const [creationMode, setCreationMode] = useState<'empty' | 'copy'>();

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

      addTab({ key: order.id, label: order.name ?? name });
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
        addFieldsAction={<AddOrderFieldsButton />}
        isCopyingOrder={creationMode === 'copy'}
        onCopyOrder={
          currentOrder?.id === orderID
            ? () => void createDocument(true)
            : undefined
        }
      />
      <EditOrderFields
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
