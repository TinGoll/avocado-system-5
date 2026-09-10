import {
  readShownNotificationIds,
  saveShownNotificationIds,
  shownNotificationsKey,
} from './shown-notifications';

describe('shown notification storage', () => {
  beforeEach(() => localStorage.clear());

  it('persists shown ids in the installation namespace', () => {
    saveShownNotificationIds(new Set(['one', 'two']));
    expect(readShownNotificationIds()).toEqual(new Set(['one', 'two']));
    expect(shownNotificationsKey()).toContain('avocado:shown-notifications:');
  });

  it('recovers from malformed local data', () => {
    localStorage.setItem(shownNotificationsKey(), '{');
    expect(readShownNotificationIds()).toEqual(new Set());
  });
});
