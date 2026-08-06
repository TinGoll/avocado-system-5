import { useCallback } from 'react';

import { useOrderStore, type Order } from '@entities/order';
import { Endpoints, useEntity } from '@shared/lib/swr';

type ReorderItemsDto = {
  itemIds: string[];
};

export const useOrderItems = ({ orderID }: { orderID: string }) => {
  const { currentOrder, setCurrentOrder } = useOrderStore();
  const { remove } = useEntity<Order, unknown>({
    endpoint: `${Endpoints.ORDERS}/${orderID}/items`,
    transform: (data) => data,
    disabled: !orderID,
  });
  const { update } = useEntity<Order, unknown, never, ReorderItemsDto>({
    endpoint: `${Endpoints.ORDERS}/${orderID}/items`,
    transform: (data) => data,
    disabled: !orderID,
  });

  const moveItem = useCallback(
    async (itemID: string, offset: -1 | 1) => {
      if (!currentOrder) return;

      const previousOrder = currentOrder;
      const items = [...(currentOrder.items ?? [])];
      const currentIndex = items.findIndex(({ id }) => id === itemID);
      const nextIndex = currentIndex + offset;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= items.length)
        return;

      [items[currentIndex], items[nextIndex]] = [
        items[nextIndex],
        items[currentIndex],
      ];
      const reorderedItems = items.map((item, position) => ({
        ...item,
        position,
      }));
      setCurrentOrder({ ...currentOrder, items: reorderedItems });

      try {
        const updatedOrder = (await update.trigger('reorder', {
          itemIds: reorderedItems.map(({ id }) => id),
        })) as unknown as Order;
        setCurrentOrder(updatedOrder);
      } catch (error) {
        setCurrentOrder(previousOrder);
        throw error;
      }
    },
    [currentOrder, setCurrentOrder, update],
  );

  const removeItem = useCallback(
    async (itemID: string) => {
      if (!currentOrder) return;

      const previousOrder = currentOrder;
      setCurrentOrder({
        ...currentOrder,
        items: currentOrder.items.filter(({ id }) => id !== itemID),
      });

      try {
        const updatedOrder = (await remove.trigger(itemID)) as unknown as Order;
        setCurrentOrder(updatedOrder);
      } catch (error) {
        setCurrentOrder(previousOrder);
        throw error;
      }
    },
    [currentOrder, remove, setCurrentOrder],
  );

  return {
    items: currentOrder?.items ?? [],
    moveItem,
    removeItem,
    isMutating: remove.isMutating || update.isMutating,
  };
};
