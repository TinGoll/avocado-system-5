import { PlusOutlined } from '@ant-design/icons';
import type { FC } from 'react';

import { AddOrderItemForm } from '@features/add-order-items';
import { CreateColorButton } from '@features/create-color';
import { CreateFacadePanelButton } from '@features/create-facade-panel';
import { CreateFacadeProfileButton } from '@features/create-facade-profile';
import { CreateMaterialButton } from '@features/create-material';
import { CreatePatinaButton } from '@features/create-patina';
import { CreateVarnishButton } from '@features/create-varnish';
import { EditOrderFields } from '@features/edit-order';
import { OrderTabs, orderTabsStore, Toolbar } from '@features/order-tabs';

export const EditOrderWidget: FC = () => {
  const { currentTabKey: orderID } = orderTabsStore();

  return (
    <div>
      <OrderTabs />
      <Toolbar />
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
      <AddOrderItemForm />
    </div>
  );
};
