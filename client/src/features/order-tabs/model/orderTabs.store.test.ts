import { beforeEach, describe, expect, it } from 'vitest';

import { orderTabsStore } from './orderTabs.store';

const tabs = [
  { key: 'first', label: 'Документ 1' },
  { key: 'second', label: 'Документ 2' },
  { key: 'third', label: 'Документ 3' },
];

describe('orderTabsStore.removeTab', () => {
  beforeEach(() => {
    orderTabsStore.getState().reset();
    orderTabsStore.getState().setTabs(tabs);
  });

  it('selects the next tab when the current tab is removed', () => {
    orderTabsStore.getState().setCurrentTabKey('second');

    orderTabsStore.getState().removeTab('second');

    expect(orderTabsStore.getState().tabs).toEqual([tabs[0], tabs[2]]);
    expect(orderTabsStore.getState().currentTabKey).toBe('third');
  });

  it('selects the previous tab when the last tab is removed', () => {
    orderTabsStore.getState().setCurrentTabKey('third');

    orderTabsStore.getState().removeTab('third');

    expect(orderTabsStore.getState().currentTabKey).toBe('second');
  });

  it('keeps the current tab when another tab is removed', () => {
    orderTabsStore.getState().setCurrentTabKey('first');

    orderTabsStore.getState().removeTab('second');

    expect(orderTabsStore.getState().currentTabKey).toBe('first');
  });
});
