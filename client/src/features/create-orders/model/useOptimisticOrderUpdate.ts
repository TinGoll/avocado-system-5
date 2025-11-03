import { useOrders, useOrderStore, type Order } from '@entities/order';

export const useOptimisticOrderUpdate = () => {
  const { update } = useOrders();
  const { currentOrder, setCurrentOrder } = useOrderStore();

  /**
   * Выполняет оптимистичное обновление заказа.
   * @param updates - частичные изменения заказа
   */
  const updateOrder = async (updates: Partial<Order>) => {
    if (!currentOrder) {
      return;
    }

    const prevOrder = currentOrder;
    const optimisticOrder = { ...currentOrder, ...updates };

    setCurrentOrder(optimisticOrder);

    try {
      const updatedOrder = await update.trigger(currentOrder.id, updates);
      setCurrentOrder(updatedOrder);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Ошибка при обновлении заказа', err);
      setCurrentOrder(prevOrder);
      throw err;
    }
  };

  const updateCharacteristic = <K extends keyof Order['characteristics']>(
    key: K,
    value: Order['characteristics'][K],
  ) => {
    if (!currentOrder) {
      return;
    }
    updateOrder({
      characteristics: {
        ...currentOrder.characteristics,
        [key]: value,
      },
    });
  };

  return { updateOrder, updateCharacteristic };
};
