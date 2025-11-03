import { useProductionOperations } from '@entities/production-operation';

export const useCreateProductionOperations = () => {
  const { data, create, isLoading } = useProductionOperations();

  const { isMutating, trigger } = create;
  return {
    isMutating,
    trigger,
    operations: data?.operations,
    isLoading,
  };
};
