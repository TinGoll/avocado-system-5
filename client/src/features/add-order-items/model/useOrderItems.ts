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

  const saveItemsOrder = useCallback(
    async (items: Order['items'], previousOrder: Order) => {
      const reorderedItems = items.map((item, position) => ({
        ...item,
        position,
      }));
      setCurrentOrder({ ...previousOrder, items: reorderedItems });

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
    [setCurrentOrder, update],
  );

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
      await saveItemsOrder(items, previousOrder);
    },
    [currentOrder, saveItemsOrder],
  );

  const moveItemTo = useCallback(
    async (itemID: string, targetItemID: string) => {
      if (!currentOrder || itemID === targetItemID) return;

      const previousOrder = currentOrder;
      const items = [...currentOrder.items];
      const currentIndex = items.findIndex(({ id }) => id === itemID);
      const targetIndex = items.findIndex(({ id }) => id === targetItemID);
      if (currentIndex < 0 || targetIndex < 0) return;

      const [movedItem] = items.splice(currentIndex, 1);
      items.splice(targetIndex, 0, movedItem);
      await saveItemsOrder(items, previousOrder);
    },
    [currentOrder, saveItemsOrder],
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
    moveItemTo,
    removeItem,
    isMutating: remove.isMutating || update.isMutating,
  };
};
