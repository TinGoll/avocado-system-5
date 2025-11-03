import { useFacadePanels } from '@entities/facade-panel/api/facadePanel.api';

export const useCreateFacadePanel = () => {
  const { data, create, isLoading } = useFacadePanels();

  const { isMutating, trigger } = create;
  return {
    isMutating,
    trigger,
    panels: data?.panels,
    isLoading,
  };
};
