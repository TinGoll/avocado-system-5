import { useCallback } from 'react';

import { useOrdersMutations, useOrderStore, type Order } from '@entities/order';

export const useOptimisticOrderUpdate = () => {
  const { update } = useOrdersMutations();
  const { isMutating, trigger } = update;
  const { setCurrentOrder } = useOrderStore();

  /**
   * Выполняет оптимистичное обновление заказа.
   * @param updates - частичные изменения заказа
   */
  const updateOrder = useCallback(
    async (updates: Partial<Order>) => {
      const currentOrder = useOrderStore.getState().currentOrder;
      if (!currentOrder) {
        return;
      }

      const prevOrder = currentOrder;
      const optimisticOrder = { ...currentOrder, ...updates };

      setCurrentOrder(optimisticOrder);

      try {
        const updatedOrder = await trigger(currentOrder.id, updates);
        setCurrentOrder(updatedOrder);
        return updatedOrder;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Ошибка при обновлении заказа', err);
        setCurrentOrder(prevOrder);
        throw err;
      }
    },
    [setCurrentOrder, trigger],
  );

  const updateCharacteristic = <K extends keyof Order['characteristics']>(
    key: K,
    value: Order['characteristics'][K],
  ) => {
    const currentOrder = useOrderStore.getState().currentOrder;
    if (!currentOrder) {
      return;
    }

    return updateOrder({
      characteristics: {
        ...currentOrder.characteristics,
        [key]: value,
      },
    });
  };

  return { updateOrder, updateCharacteristic, isMutating };
};
