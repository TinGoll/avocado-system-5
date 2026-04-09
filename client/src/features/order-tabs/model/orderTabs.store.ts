import { create } from 'zustand';

type TabItem = {
  key: string;
  label: string;
};

type OrderTabsState = {
  tabs: TabItem[];
  currentTabKey?: string;
  initialization: boolean;
  setCurrentTabKey: (tabKey?: string) => void;
  setTabs: (tabs: TabItem[]) => void;
  reset: () => void;
};

export const orderTabsStore = create<OrderTabsState>((set) => ({
  tabs: [],
  initialization: false,
  currentTabKey: undefined,

  setCurrentTabKey: (tabKey) => set({ currentTabKey: tabKey }),

  setTabs: (tabs) =>
    set((state) => {
      if (tabs.length === 0) {
        return { tabs: [], currentTabKey: undefined };
      }

      const stillExists = tabs.some((t) => t.key === state.currentTabKey);
      let currentTabKey = state.currentTabKey;

      if (!stillExists) {
        currentTabKey = tabs[tabs.length - 1].key;
      }

      return {
        tabs,
        currentTabKey,
        initialization: true,
      };
    }),

  reset: () =>
    set({ tabs: [], currentTabKey: undefined, initialization: false }),
}));
