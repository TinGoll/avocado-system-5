import { useOrderGroupByID, useOrderStore } from '@entities/order';

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
