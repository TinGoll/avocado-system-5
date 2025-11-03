import type { Order, OrderGroup, OrderItem } from '@entities/order';
import type { CONDITION_SOURCE } from '@entities/price-modifiers';

import type { LabelsMap } from './types';

const orderGroupFieldLabels: LabelsMap<
  Omit<OrderGroup, 'orders' | 'id' | 'startedAt' | 'createdAt' | 'updatedAt'>
> = {
  orderNumber: { _title: 'Номер заказа' },
  customer: {
    _title: 'Заказчик',
    children: {
      name: { _title: 'Имя заказчика' },
      level: { _title: 'Уровень лояльности' },
    },
  },
  status: { _title: 'Статус заказа' },
  orderCount: { _title: 'Количество документов' },
};

const orderFieldLabels: LabelsMap<Omit<Order, 'items'>> = {
  id: {
    _title: 'ID Документа',
  },
  characteristics: {
    _title: 'Параметры документа',
    children: {
      material: {
        _title: 'Материал',
        children: {
          name: {
            _title: 'Название',
          },
          type: {
            _title: 'Тип',
          },
        },
      },
      color: {
        _title: 'Краситель',
        children: {
          name: {
            _title: 'Название',
          },
          type: {
            _title: 'Тип',
          },
        },
      },
      patina: {
        _title: 'Патина',
        children: {
          name: {
            _title: 'Название',
          },
        },
      },
      panel: {
        _title: 'Филёнка',
        children: {
          name: {
            _title: 'Название',
          },
          characteristics: {
            _title: 'Характеристики',
            children: {
              style: {
                _title: 'Стиль',
              },
            },
          },
        },
      },
      profile: {
        _title: 'Фасадный Профиль',
        children: {
          name: {
            _title: 'Название',
          },
          characteristics: {
            _title: 'Характеристики',
            children: {
              width: {
                _title: 'Ширина профиля',
              },
              grooveDepth: {
                _title: 'Глубина паза',
              },
              grooveWidth: {
                _title: 'Ширина паза',
              },
              style: {
                _title: 'Стиль',
              },
            },
          },
        },
      },
      varnish: {
        _title: 'Лак',
        children: {
          name: {
            _title: 'Название',
          },
        },
      },
    },
  },
  totalPrice: {
    _title: 'Полная стоимость',
  },
  createdAt: {
    _title: 'Дата создания',
  },
  updatedAt: {
    _title: 'Дата обновления',
  },
};

const itemFieldLabels: LabelsMap<OrderItem> = {
  id: {
    _title: 'ID элемента заказа',
  },
  template: {
    _title: 'Шаблон продукта',
    children: {
      id: {
        _title: 'ID шаблона',
      },
      name: {
        _title: 'Название',
      },
      defaultCharacteristics: {
        _title: 'Характеристики по умолчанию',
        children: {
          width: {
            _title: 'Ширина',
          },
          height: {
            _title: 'Высота',
          },
          thickness: {
            _title: 'Толщина',
          },
        },
      },
      customerPricingMethod: {
        _title: 'Метод расчета для заказчика',
      },
      baseCustomerPrice: {
        _title: 'Базовая стоимость',
      },
      attributes: {
        _title: 'Аттрибуты',
        children: {},
      },
      group: {
        _title: 'Группа',
      },
      createdAt: {
        _title: 'Дата создания',
      },
      updatedAt: {
        _title: 'Дата обновления',
      },
    },
  },
  quantity: {
    _title: 'Количество',
  },
  snapshot: {
    _title: 'Снимок',
    children: {
      name: {
        _title: 'Название',
      },
      baseCustomerPrice: {
        _title: 'Базовая цена для заказчика',
      },
      attributes: {
        _title: 'Аттрибуты',
        children: {},
      },
      customerPricingMethod: {
        _title: 'Метод расчета для заказчика',
      },
      defaultCharacteristics: {
        _title: 'Характеристики по умолчанию',
        children: {
          width: {
            _title: 'Ширина',
          },
          height: {
            _title: 'Высота',
          },
          thickness: {
            _title: 'Толщина',
          },
        },
      },
    },
  },
  characteristics: {
    _title: 'Характеристики',
    children: {
      width: {
        _title: 'Ширина',
      },
      height: {
        _title: 'Высота',
      },
      thickness: {
        _title: 'Толщина',
      },
    },
  },
  calculatedProductionCost: {
    _title: 'Себестоимость',
  },
  calculatedCustomerPrice: {
    _title: 'Цена для заказчика',
  },
};

export const fieldLabels = {
  order_group: orderGroupFieldLabels,
  order: orderFieldLabels,
  item: itemFieldLabels,
};

export const getLabelForKeyInContext = (
  source:
    | typeof CONDITION_SOURCE.ORDER
    | typeof CONDITION_SOURCE.ITEM
    | typeof CONDITION_SOURCE.ORDER_GROUP,
  currentPathParts: string[],
  key: string,
): string => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parentMap: any = fieldLabels[source];

  for (const part of currentPathParts) {
    const currentNode = parentMap?.[part];
    parentMap = currentNode?.children;

    if (!parentMap) {
      return key;
    }
  }
  const targetNode = parentMap?.[key];

  return targetNode?._title ?? key;
};
