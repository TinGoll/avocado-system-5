import {
  dismissedNotificationsKey,
  readDismissedNotificationIds,
  saveDismissedNotificationIds,
} from './shown-notifications';

describe('dismissed notification storage', () => {
  beforeEach(() => localStorage.clear());

  it('persists shown ids in the installation namespace', () => {
    saveDismissedNotificationIds(new Set(['one', 'two']));
    expect(readDismissedNotificationIds()).toEqual(new Set(['one', 'two']));
    expect(dismissedNotificationsKey()).toContain(
      'avocado:dismissed-notifications:v1:',
    );
  });

  it('recovers from malformed local data', () => {
    localStorage.setItem(dismissedNotificationsKey(), '{');
    expect(readDismissedNotificationIds()).toEqual(new Set());
  });
});
