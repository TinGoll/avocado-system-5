import { useVarnishes } from '@entities/varnish';

export const useCreateVarnish = () => {
  const { data, create, isLoading } = useVarnishes();

  const { isMutating, trigger } = create;
  return {
    isMutating,
    trigger,
    varnishes: data?.varnishes,
    isLoading,
  };
};
