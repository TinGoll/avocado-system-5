import { usePriceModifiers } from '@entities/price-modifiers';
import { useProductTemplates } from '@entities/product';

export const useCreateProductTemplates = () => {
  const { data, create, isLoading: isProductsLoading } = useProductTemplates();
  const {
    data: priceModifiersData,
    error: priceModifiersError,
    isLoading: isPriceModifiersLoading,
  } = usePriceModifiers();

  const { isMutating, trigger } = create;
  return {
    isMutating,
    trigger,
    products: data?.products,
    priceModifiers: priceModifiersData?.modifiers,
    priceModifiersError,
    isLoading: isProductsLoading || isPriceModifiersLoading,
  };
};
