import type { Item, LabelsMap, Order } from './types';

// Omit<Order, 'items'> используется, чтобы TypeScript не требовал описывать поле items
const orderFieldLabels: LabelsMap<Omit<Order, 'items'>> = {
  id: { _title: 'ID Заказа' },
  totalPrice: { _title: 'Общая сумма' },
  itemCount: { _title: 'Количество позиций' },
  customer: {
    _title: 'Заказчик', // <-- Название для самого объекта customer
    children: {
      id: { _title: 'ID Заказчика' },
      name: { _title: 'Имя Заказчика' },
      level: { _title: 'Уровень лояльности' },
      address: {
        _title: 'Адрес', // <-- Название для объекта address
        children: {
          city: { _title: 'Город' },
          street: { _title: 'Улица' },
        },
      },
    },
  },
};

const itemFieldLabels: LabelsMap<Item> = {
  id: { _title: 'ID Элемента' },
  productId: { _title: 'ID Продукта' },
  quantity: { _title: 'Количество' },
  price: { _title: 'Цена' },
  productDetails: {
    _title: 'Детали продукта', // <-- Название для объекта productDetails
    children: {
      name: { _title: 'Название продукта' },
      category: { _title: 'Категория продукта' },
      weight: { _title: 'Вес' },
    },
  },
};

export const fieldLabels = {
  order: orderFieldLabels,
  item: itemFieldLabels,
};

// Хелпер теперь будет проще и надежнее
export const getLabelForKeyInContext = (
  source: 'order' | 'item',
  currentPathParts: string[], // Путь к родительскому объекту, например ['customer']
  key: string, // Ключ, для которого ищем название, например 'address'
): string => {
  // Начинаем с верхнего уровня карты названий для 'order' или 'item'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parentMap: any = fieldLabels[source];

  // 1. Спускаемся по дереву, чтобы найти карту названий для родительского объекта
  for (const part of currentPathParts) {
    // Находим узел для текущей части пути
    const currentNode = parentMap?.[part];
    // Следующий уровень для поиска находится внутри 'children' этого узла
    parentMap = currentNode?.children;

    // Если на каком-то этапе мы не нашли узел, значит путь невалиден в карте названий,
    // возвращаем ключ как запасной вариант
    if (!parentMap) {
      return key;
    }
  }

  // 2. Теперь `parentMap` - это объект, содержащий узел для нашего `key`
  // (например, `children` узла 'customer')
  const targetNode = parentMap?.[key];

  // 3. Возвращаем `_title` из найденного узла или сам ключ, если узел не найден
  return targetNode?._title ?? key;
};
