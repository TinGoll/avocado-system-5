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

interface PriceModifierState {
  modifier: PriceModifier;
  actions: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateField: (field: keyof PriceModifier, value: any) => void;

    setInitialState: (initialState: PriceModifier) => void;

    updateConditionField: (
      path: (string | number)[],
      field: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: any,
    ) => void;

    addCondition: (
      pathToGroup: (string | number)[],
      groupType: 'AND' | 'OR',
    ) => void;

    removeCondition: (path: (string | number)[]) => void;

    transformToGroup: (
      path: (string | number)[],
      groupType: 'AND' | 'OR',
    ) => void;

    changeGroupType: (
      path: (string | number)[],
      newGroupType: 'AND' | 'OR',
    ) => void;

    flattenGroup: (path: (string | number)[]) => void;
  };
}

const defaultInitialState: PriceModifier = {
  id: '',
  name: '',
  type: 'percentage',
  value: 10,
  conditions: {
    source: 'order',
    path: '',
    operator: 'gte',
    value: 0,
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
          const parentPath = path.slice(0, -2);
          const arrayKey = path[path.length - 2];
          const indexToRemove = path[path.length - 1] as number;

          const parent = getIn(draft.modifier, parentPath);
          if (parent && Array.isArray(parent[arrayKey])) {
            parent[arrayKey].splice(indexToRemove, 1);
          }
        }),
      );
    },

    transformToGroup: (path: (string | number)[], groupType: 'AND' | 'OR') => {
      set(
        produce((draft) => {
          const parentPath = path.slice(0, -1);
          const conditionKey = path[path.length - 1];
          const parent = getIn(draft.modifier, parentPath);

          if (parent && parent[conditionKey]) {
            const currentCondition = { ...parent[conditionKey] };

            if ('AND' in currentCondition || 'OR' in currentCondition) {
              return;
            }
            parent[conditionKey] = { [groupType]: [currentCondition] };
          }
        }),
      );
    },
    changeGroupType: (path, newGroupType) => {
      set(
        produce((draft) => {
          const parentPath = path.slice(0, -1);
          const conditionKey = path[path.length - 1];
          const parent = getIn(draft.modifier, parentPath);

          if (parent && parent[conditionKey]) {
            const group = parent[conditionKey];
            const oldGroupType = newGroupType === 'AND' ? 'OR' : 'AND';

            if (oldGroupType in group) {
              const conditions = group[oldGroupType];
              parent[conditionKey] = { [newGroupType]: conditions };
            }
          }
        }),
      );
    },
    flattenGroup: (path) => {
      set(
        produce((draft) => {
          const parentPath = path.slice(0, -1);
          const conditionKey = path[path.length - 1];
          const parent = getIn(draft.modifier, parentPath);

          if (parent && parent[conditionKey]) {
            const group = parent[conditionKey];
            const groupType = 'AND' in group ? 'AND' : 'OR';
            const conditions = group[groupType];

            if (conditions && conditions.length > 0) {
              parent[conditionKey] = conditions[0];
            } else {
              parent[conditionKey] = {
                source: 'order',
                path: '',
                operator: 'gte',
                value: 0,
              };
            }
          }
        }),
      );
    },
  },
}));
