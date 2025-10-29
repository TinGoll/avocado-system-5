import { useFacadeProfiles } from '@entities/facade-profile';

export const useCreateFacadeProfile = () => {
  const { data, create, isLoading } = useFacadeProfiles();

  const { isMutating, trigger } = create;
  return {
    isMutating,
    trigger,
    profiles: data?.profiles,
    isLoading,
  };
};
