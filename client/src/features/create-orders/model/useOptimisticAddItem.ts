import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { useOrderStore, type Order, type OrderItem } from '@entities/order';
import type { ProductTemplate } from '@entities/product';
import { Endpoints, useEntity } from '@shared/lib/swr';

type Props = {
  orderID: string;
};

type AddItemProps = {
  template: ProductTemplate;
  quantity: number;
  characteristics: OrderItem['characteristics'];
};

type AddItemDTO = Omit<AddItemProps, 'template'> & { templateId: string };

const toDTO = (props: AddItemProps): AddItemDTO => ({
  templateId: props.template.id,
  quantity: props.quantity,
  characteristics: props.characteristics,
});

const createTempItem = (props: AddItemProps): OrderItem => ({
  id: `temp-${uuidv4()}`,
  template: props.template,
  snapshot: props.template,
  quantity: props.quantity,
  characteristics: props.characteristics,
  calculatedProductionCost: 0,
  calculatedCustomerPrice: 0,
});

export const useOptimisticAddItem = ({ orderID }: Props) => {
  const { currentOrder, setCurrentOrder } = useOrderStore();
  const { create } = useEntity<Order, unknown, AddItemDTO>({
    endpoint: `${Endpoints.ORDERS}/${orderID}/items`,
    transform: (data) => data,
  });
  const { trigger, isMutating } = create;

  const addItem = useCallback(
    async (props: AddItemProps): Promise<Order | undefined> => {
      if (!currentOrder) {
        // eslint-disable-next-line no-console
        console.warn('Попытка добавить элемент без текущего заказа');
        return;
      }

      const prevOrder = currentOrder;
      const tempItem = createTempItem(props);

      const optimisticOrder: Order = {
        ...currentOrder,
        items: [...(currentOrder.items ?? []), tempItem],
      };
      setCurrentOrder(optimisticOrder);

      try {
        const updatedOrder = await trigger(toDTO(props));
        setCurrentOrder(updatedOrder);
        return updatedOrder;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Ошибка при добавлении элемента в заказ:', error);
        setCurrentOrder(prevOrder);
      }
    },
    [currentOrder, trigger, setCurrentOrder],
  );

  return { addItem, isMutating };
};
