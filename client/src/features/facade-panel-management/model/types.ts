import type { FacadeProfileCharacteristics } from '@entities/facade-panel/model/types';

export type FieldType = {
  name: string;
  style?: FacadeProfileCharacteristics['style'];
};
