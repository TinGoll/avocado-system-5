import type { OrderCharacteristics } from '@shared/lib/swr';

export type { OrderCharacteristics } from '@shared/lib/swr';

type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

export type OrderTemplate = {
  id: string;
  name: string;
  description: string;
  getDefaultCharacteristics: () => DeepPartial<OrderCharacteristics>;
};
export * from './orderTemplates';
