import { usePatinas } from '@entities/patina';

export const useCreatePatina = () => {
  const { data, create, isLoading } = usePatinas();

  const { isMutating, trigger } = create;
  return {
    isMutating,
    trigger,
    patinas: data?.patinas,
    isLoading,
  };
};
