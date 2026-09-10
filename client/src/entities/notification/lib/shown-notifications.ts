const WEB_INSTALLATION_KEY = 'avocado:installation-id';

export const getInstallationId = (): string => {
  if (window.avocadoDesktop?.installationId)
    return window.avocadoDesktop.installationId;
  const existing = localStorage.getItem(WEB_INSTALLATION_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(WEB_INSTALLATION_KEY, created);
  return created;
};

export const shownNotificationsKey = () =>
  `avocado:shown-notifications:${getInstallationId()}`;

export const readShownNotificationIds = (): Set<string> => {
  try {
    const value = JSON.parse(
      localStorage.getItem(shownNotificationsKey()) ?? '[]',
    );
    return new Set(
      Array.isArray(value) ? value.filter((id) => typeof id === 'string') : [],
    );
  } catch {
    return new Set();
  }
};

export const saveShownNotificationIds = (ids: Set<string>) => {
  localStorage.setItem(
    shownNotificationsKey(),
    JSON.stringify([...ids].slice(-1000)),
  );
};
