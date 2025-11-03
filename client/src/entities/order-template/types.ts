import type { OrderCharacteristics } from '@entities/order/model/types';
import type { DeepPartial } from '@shared/utils/objectHelpers';

export interface OrderTemplate {
  id: string;
  name: string;
  description: string;
  getDefaultCharacteristics: () => DeepPartial<OrderCharacteristics>;
}
