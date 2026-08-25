import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useOrderStore, type Order, type OrderItem } from '@entities/order';
import type { ProductTemplate } from '@entities/product';
import { Endpoints, useEntity } from '@shared/lib/swr';

type AddItemProps = {
  template: ProductTemplate;
  quantity: number;
  characteristics: OrderItem['characteristics'];
};

type AddItemDto = Omit<AddItemProps, 'template'> & { templateId: string };

const toDto = ({ template, ...item }: AddItemProps): AddItemDto => ({
  ...item,
  templateId: template.id,
});

const createTemporaryItem = (props: AddItemProps): OrderItem => ({
  id: `temp-${uuidv4()}`,
  position: 0,
  template: props.template,
  snapshot: props.template,
  quantity: props.quantity,
  characteristics: props.characteristics,
  productionOperationResults: [],
  calculatedProductionCost: 0,
  calculatedCustomerPrice: 0,
});

export const useOptimisticAddItem = ({ orderID }: { orderID: string }) => {
  const { currentOrder, setCurrentOrder } = useOrderStore();
  const { create } = useEntity<Order, unknown, AddItemDto>({
    endpoint: `${Endpoints.ORDERS}/${orderID}/items`,
    transform: (data) => data,
    disabled: true,
  });

  const addItem = useCallback(
    async (props: AddItemProps): Promise<Order> => {
      if (!currentOrder) {
        throw new Error('Текущий заказ не загружен');
      }

      const previousOrder = currentOrder;
      setCurrentOrder({
        ...currentOrder,
        items: [
          ...(currentOrder.items ?? []),
          {
            ...createTemporaryItem(props),
            position: currentOrder.items?.length ?? 0,
          },
        ],
      });

      try {
        const updatedOrder = await create.trigger(toDto(props));
        setCurrentOrder(updatedOrder);
        return updatedOrder;
      } catch (error) {
        setCurrentOrder(previousOrder);
        throw error;
      }
    },
    [create, currentOrder, setCurrentOrder],
  );

  return { addItem, isMutating: create.isMutating };
};
