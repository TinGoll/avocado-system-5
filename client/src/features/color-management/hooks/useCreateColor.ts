import { useColors } from '@entities/color';

export const useCreateColor = () => {
  const { data, create, isLoading } = useColors();

  const { isMutating, trigger } = create;
  return {
    isMutating,
    trigger,
    colors: data?.colors,
    isLoading,
  };
};
