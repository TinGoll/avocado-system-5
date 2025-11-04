import { useColors } from '../api/colors.api';

export const useColorMap = () => {
  const { data, isLoading } = useColors();
  return {
    colors: data?.map,
    isLoading,
  };
};
