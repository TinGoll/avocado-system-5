import type { FacadePanelCharacteristics } from '@entities/facade-panel';

export type FieldType = {
  name: string;
  style?: FacadePanelCharacteristics['style'];
};
