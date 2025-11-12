import { useOrderByIDWithItems } from '../api/useOrderByIDWithItems';
import { useOrderStore } from '../model/orderStore';

export const useLoadOrder = (orderID?: string) => {
  const { setCurrentOrder, reset } = useOrderStore();

  const { data, isLoading, error } = useOrderByIDWithItems({
    id: orderID,
    onSuccess: setCurrentOrder,
    onError: () => reset(),
  });

  return {
    order: data,
    isLoading,
    error,
  };
};
