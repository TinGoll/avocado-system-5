import type { OrderTemplate } from './types';

export const orderTemplatesMap = {
  basic: {
    id: 'basic',
    name: 'Пустой',
    description: 'Простой заказ без характеристик',
    getDefaultCharacteristics: () => ({}),
  },
  colored_material: {
    id: 'colored_material',
    name: 'Цветной материал',
    description: 'Добавляет поля для выбора материала и цвета',
    getDefaultCharacteristics: () => ({
      material: {},
      color: {},
    }),
  },
  facade: {
    id: 'facade',
    name: 'Фасады',
    description:
      'Добавляет материал, цвет, патину, лак, филенку и профиль фасада',
    getDefaultCharacteristics: () => ({
      material: {},
      color: {},
      profile: {},
      panel: {},
      patina: {},
      varnish: {},
    }),
  },
} satisfies Record<string, OrderTemplate>;

export type OrderTemplateId = keyof typeof orderTemplatesMap;

export const orderTemplates = Object.values(orderTemplatesMap);
