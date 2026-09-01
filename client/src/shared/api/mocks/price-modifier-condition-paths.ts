const field = (label: string, type: 'string' | 'number') => ({ label, type });

const enumField = (label: string, options: readonly string[]) => ({
  label,
  type: 'enum' as const,
  options,
});

const group = (label: string, children: Record<string, unknown>) => ({
  label,
  children,
});

export const priceModifierConditionPathSchemas = {
  order_group: {
    id: field('ID заказа', 'number'),
    orderNumber: field('Номер заказа', 'string'),
    customer: group('Заказчик', {
      name: field('Имя заказчика', 'string'),
      level: enumField('Уровень лояльности', ['bronze', 'silver', 'gold']),
    }),
    status: enumField('Статус заказа', [
      'draft',
      'in_production',
      'completed',
      'cancelled',
    ]),
  },
  order: {
    characteristics: group('Параметры документа', {
      thermalSeam: enumField('Термошов', ['Да', 'Нет']),
      drilling: enumField('Присадка', ['Да', 'Нет']),
      color: group('Краситель', {
        name: field('Название', 'string'),
        type: enumField('Тип', ['stain', 'enamel']),
      }),
      material: group('Материал', {
        name: field('Название', 'string'),
        type: enumField('Тип', ['softwood', 'hardwood', 'mdf']),
      }),
      patina: group('Патина', { name: field('Название', 'string') }),
      panel: group('Филёнка', {
        name: field('Название', 'string'),
        characteristics: group('Характеристики', {
          style: field('Стиль', 'string'),
        }),
      }),
      varnish: group('Лак', { name: field('Название', 'string') }),
      profile: group('Фасадный профиль', {
        name: field('Название', 'string'),
        characteristics: group('Характеристики', {
          width: field('Ширина профиля', 'number'),
          grooveDepth: field('Глубина паза', 'number'),
          grooveWidth: field('Ширина паза', 'number'),
          style: field('Стиль', 'string'),
        }),
      }),
    }),
  },
  item: {
    template: group('Шаблон продукта', {
      name: field('Название', 'string'),
      defaultCharacteristics: group('Характеристики по умолчанию', {
        width: field('Ширина', 'number'),
        height: field('Высота', 'number'),
        thickness: field('Толщина', 'number'),
      }),
      customerPricingMethod: enumField('Метод расчёта для заказчика', [
        'per_item',
        'linear_meter',
        'area',
        'volume',
      ]),
      baseCustomerPrice: field('Базовая стоимость', 'number'),
      group: field('Группа', 'string'),
    }),
    quantity: field('Количество', 'number'),
    snapshot: group('Снимок', {
      name: field('Название', 'string'),
      baseCustomerPrice: field('Базовая цена для заказчика', 'number'),
      customerPricingMethod: enumField('Метод расчёта для заказчика', [
        'per_item',
        'linear_meter',
        'area',
        'volume',
      ]),
      defaultCharacteristics: group('Характеристики по умолчанию', {
        width: field('Ширина', 'number'),
        height: field('Высота', 'number'),
        thickness: field('Толщина', 'number'),
      }),
    }),
    characteristics: group('Характеристики', {
      width: field('Ширина', 'number'),
      height: field('Высота', 'number'),
      thickness: field('Толщина', 'number'),
    }),
  },
} as const;
