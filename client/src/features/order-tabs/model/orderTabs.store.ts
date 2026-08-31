import { create } from 'zustand';

type TabItem = {
  key: string;
  label: string;
  documentNumber: number;
};

type OrderTabsState = {
  tabs: TabItem[];
  currentTabKey?: string;
  initialization: boolean;
  setCurrentTabKey: (tabKey?: string) => void;
  setTabs: (tabs: TabItem[]) => void;
  addTab: (tab: TabItem) => void;
  removeTab: (tabKey: string) => void;
  renameTab: (tabKey: string, name: string) => void;
  reset: () => void;
};

export const orderTabsStore = create<OrderTabsState>((set) => ({
  tabs: [],
  initialization: false,
  currentTabKey: undefined,

  setCurrentTabKey: (tabKey) => set({ currentTabKey: tabKey }),

  addTab: (tab) =>
    set((state) => ({
      tabs: [...state.tabs, tab],
      currentTabKey: tab.key,
    })),

  removeTab: (tabKey) =>
    set((state) => {
      const removedTabIndex = state.tabs.findIndex((tab) => tab.key === tabKey);
      const tabs = state.tabs.filter((tab) => tab.key !== tabKey);

      if (state.currentTabKey !== tabKey) {
        return { tabs };
      }

      return {
        tabs,
        currentTabKey: tabs[Math.min(removedTabIndex, tabs.length - 1)]?.key,
      };
    }),

  renameTab: (tabKey, name) =>
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.key === tabKey ? { ...tab, label: name } : tab,
      ),
    })),

  setTabs: (tabs) =>
    set((state) => {
      if (tabs.length === 0) {
        return { tabs: [], currentTabKey: undefined };
      }

      const stillExists = tabs.some((t) => t.key === state.currentTabKey);
      let currentTabKey = state.currentTabKey;

      if (!stillExists) {
        currentTabKey = tabs[0].key;
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
