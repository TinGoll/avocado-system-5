import { useOrderGroupByID } from '../api/useOrderGroupByID';
import { useOrderStore } from '../model/orderStore';

export const useLoadOrderGroup = (groupID: number | null) => {
  const { setCurrentGroup, reset } = useOrderStore();

  const { data, isLoading, error } = useOrderGroupByID({
    groupID,
    onSuccess: setCurrentGroup,
    onError: () => reset(),
  });

  return {
    group: data,
    isLoading,
    error,
  };
};
