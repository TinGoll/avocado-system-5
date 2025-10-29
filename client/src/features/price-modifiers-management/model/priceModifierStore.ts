import { produce } from 'immer';
import { create } from 'zustand';

import type { PriceModifier } from '@entities/price-modifiers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getIn = (obj: any, path: (string | number)[]) => {
  return path.reduce(
    (acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined),
    obj,
  );
};

// Определяем состояние и действия
interface PriceModifierState {
  modifier: PriceModifier;
  actions: {
    // Обновление полей верхнего уровня (name, type, value)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateField: (field: keyof PriceModifier, value: any) => void;

    // Инициализация или сброс всей формы
    setInitialState: (initialState: PriceModifier) => void;

    // Обновление конкретного поля в условии по его пути
    updateConditionField: (
      path: (string | number)[],
      field: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: any,
    ) => void;

    // Добавление нового условия в группу
    addCondition: (
      pathToGroup: (string | number)[],
      groupType: 'AND' | 'OR',
    ) => void;

    // Удаление условия (листа или группы)
    removeCondition: (path: (string | number)[]) => void;

    // Преобразование листа в группу
    transformToGroup: (
      path: (string | number)[],
      groupType: 'AND' | 'OR',
    ) => void;
  };
}

const defaultInitialState: PriceModifier = {
  id: '',
  name: '',
  type: 'percentage',
  value: 10,
  conditions: {
    // Начнем с простого листа, чтобы показать гибкость
    source: 'order',
    path: 'totalPrice',
    operator: 'gte',
    value: 1000,
  },
  productTemplates: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const usePriceModifierStore = create<PriceModifierState>((set) => ({
  modifier: defaultInitialState,
  actions: {
    setInitialState: (initialState) => set({ modifier: initialState }),

    updateField: (field, value) => {
      set(
        produce((draft) => {
          draft.modifier[field] = value;
        }),
      );
    },

    updateConditionField: (path, field, value) => {
      set(
        produce((draft) => {
          // Находим родительский объект условия
          const parentPath = path.slice(0, -1);
          const conditionKey = path[path.length - 1];
          const parent = getIn(draft.modifier, parentPath);
          if (parent && parent[conditionKey]) {
            parent[conditionKey][field] = value;
          }
        }),
      );
    },

    addCondition: (pathToGroup, groupType) => {
      set(
        produce((draft) => {
          const group = getIn(draft.modifier, pathToGroup);
          if (group && Array.isArray(group[groupType])) {
            group[groupType].push({
              source: 'item',
              path: '',
              operator: 'eq',
              value: 0,
            });
          }
        }),
      );
    },

    removeCondition: (path) => {
      set(
        produce((draft) => {
          const parentPath = path.slice(0, -2); // Путь к объекту, содержащему массив
          const arrayKey = path[path.length - 2]; // 'AND' или 'OR'
          const indexToRemove = path[path.length - 1] as number;

          const parent = getIn(draft.modifier, parentPath);
          if (parent && Array.isArray(parent[arrayKey])) {
            parent[arrayKey].splice(indexToRemove, 1);
          }
        }),
      );
    },

    transformToGroup: (path, groupType) => {
      set(
        produce((draft) => {
          const parentPath = path.slice(0, -1);
          const conditionKey = path[path.length - 1];
          const parent = getIn(draft.modifier, parentPath);
          if (parent) {
            // Заменяем объект листа на объект группы
            parent[conditionKey] = { [groupType]: [] };
          }
        }),
      );
    },
  },
}));
