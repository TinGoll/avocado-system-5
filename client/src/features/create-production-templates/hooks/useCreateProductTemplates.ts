import { usePriceModifiers } from '@entities/price-modifiers';
import { useProductTemplates } from '@entities/product';
import { useProductionOperations } from '@entities/production-operation';

export const useCreateProductTemplates = () => {
  const { data, create, isLoading: isProductsLoading } = useProductTemplates();
  const {
    data: priceModifiersData,
    error: priceModifiersError,
    isLoading: isPriceModifiersLoading,
  } = usePriceModifiers();
  const {
    data: operationsData,
    error: operationsError,
    isLoading: isOperationsLoading,
  } = useProductionOperations();

  const { isMutating, trigger } = create;
  return {
    isMutating,
    trigger,
    products: data?.products,
    operations: operationsData?.operations,
    operationsError,
    priceModifiers: priceModifiersData?.modifiers,
    priceModifiersError,
    isLoading:
      isProductsLoading || isPriceModifiersLoading || isOperationsLoading,
  };
};
