import { create } from 'zustand';

import type { Order, OrderGroup } from './types';

interface OrderState {
  currentGroup?: OrderGroup;
  currentOrder?: Order;
  isCreating: boolean;

  setCurrentGroup: (group: OrderGroup) => void;
  setCurrentOrder: (order: Order) => void;
  reset: () => void;

  setCreating: (value: boolean) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  isCreating: false,
  setCurrentGroup: (group) => set({ currentGroup: group }),
  setCurrentOrder: (order) => set({ currentOrder: order }),
  setCreating: (v) => set({ isCreating: v }),
  reset: () => set({ currentGroup: undefined, currentOrder: undefined }),
}));
