import { useProductTemplates } from '@entities/product';

export const useCreateProductTemplates = () => {
  const { data, create, isLoading } = useProductTemplates();

  const { isMutating, trigger } = create;
  return {
    isMutating,
    trigger,
    products: data?.products,
    isLoading,
  };
};
