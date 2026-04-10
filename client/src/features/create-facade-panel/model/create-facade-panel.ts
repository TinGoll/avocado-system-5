import type { FacadeProfileCharacteristics } from '@entities/facade-panel';

export type FieldType = {
  name: string;
  style?: FacadeProfileCharacteristics['style'];
};
