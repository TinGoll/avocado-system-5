import { useColors } from '@entities/color';

export const useUpdateColor = () => {
  const { data, update, isLoading } = useColors();

  const { isMutating, trigger } = update;
  return {
    isMutating,
    trigger,
    colors: data?.colors,
    isLoading,
  };
};
