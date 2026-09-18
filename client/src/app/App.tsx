import { type FC, useCallback, useState } from 'react';
import { BrowserRouter, HashRouter } from 'react-router';

import { AntdConfigProvider } from './providers/AntdConfigProvider.tsx';
import { BusinessNotificationsProvider } from './providers/BusinessNotificationsProvider';
import { initializeDayjsConf } from './providers/dayjs.conf';
import { routesElements } from './routes/routesElements';
import { ServerConnectionScreen } from './ui/ServerConnectionScreen';

initializeDayjsConf();

const Router = window.avocadoDesktop ? HashRouter : BrowserRouter;

export const App: FC = () => {
  const [isServerReady, setIsServerReady] = useState(false);
  const [isTransitionComplete, setIsTransitionComplete] = useState(false);
  const handleConnected = useCallback(() => setIsServerReady(true), []);
  const handleTransitionComplete = useCallback(
    () => setIsTransitionComplete(true),
    [],
  );

  return (
    <AntdConfigProvider>
      {isServerReady && (
        <div className="app-entry-animation">
          <Router useTransitions={false}>
            <BusinessNotificationsProvider>
              {routesElements()}
            </BusinessNotificationsProvider>
          </Router>
        </div>
      )}
      {!isTransitionComplete && (
        <ServerConnectionScreen
          onConnected={handleConnected}
          onTransitionComplete={handleTransitionComplete}
        />
      )}
    </AntdConfigProvider>
  );
};
