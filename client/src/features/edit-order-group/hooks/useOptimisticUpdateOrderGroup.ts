import { useCallback } from 'react';

import {
  useOrderGroupMutations,
  useOrderStore,
  type OrderGroup,
} from '@entities/order';

type OrderGroupUpdateDTO = {
  orderNumber?: string;
  customer?: OrderGroup['customer'];
  status?: OrderGroup['status'];
  startedAt?: Date;
};

export const useOptimisticUpdateOrderGroup = () => {
  const { update } = useOrderGroupMutations();
  const { trigger, isMutating } = update;
  const { setCurrentGroup } = useOrderStore();

  const updateGroup = useCallback(
    async (updates: OrderGroupUpdateDTO) => {
      const currentGroup = useOrderStore.getState().currentGroup;
      if (!currentGroup) {
        return;
      }
      const prevGroup = currentGroup;
      const optimisticGroup = { ...currentGroup, ...updates };
      setCurrentGroup(optimisticGroup);

      try {
        const updatedGroup = await trigger(currentGroup.id, updates);
        setCurrentGroup(updatedGroup);
        return updatedGroup;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to update order group:', err);
        setCurrentGroup(prevGroup);
      }
    },
    [setCurrentGroup, trigger],
  );

  return {
    updateGroup,
    isMutating,
  };
};
