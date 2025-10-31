import { COLOR_TYPE } from '@entities/color';
import { MATERIAL_TYPE } from '@entities/material';
import { CUSTOMER_PRICING_METHOD } from '@entities/product';

export const enumMapper: Record<string, string> = {
  [MATERIAL_TYPE.HARDWOOD]: 'Твердая древесина',
  [MATERIAL_TYPE.SOFTWOOD]: 'Мягкая древесина',
  [MATERIAL_TYPE.MDF]: 'МДФ',
  [COLOR_TYPE.ENAMEL]: 'Эмаль',
  [COLOR_TYPE.STAIN]: 'Морилка',
  [CUSTOMER_PRICING_METHOD.PER_ITEM]: 'За штуку',
  [CUSTOMER_PRICING_METHOD.AREA]: 'Квадратура',
  [CUSTOMER_PRICING_METHOD.VOLUME]: 'Кубатура',
};

export const getEnumName = (value: string): string => {
  return enumMapper[value] ?? value;
};
