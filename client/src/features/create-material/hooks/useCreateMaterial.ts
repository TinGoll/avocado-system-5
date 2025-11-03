import { useMaterials } from '@entities/material';

export const useCreateMaterial = () => {
  const { data, create, isLoading } = useMaterials();

  const { isMutating, trigger } = create;
  return {
    isMutating,
    trigger,
    materials: data?.materials,
    isLoading,
  };
};
