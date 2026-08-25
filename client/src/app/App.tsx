import { type FC, useCallback, useState } from 'react';
import { BrowserRouter } from 'react-router';

import { AntdConfigProvider } from './providers/AntdConfigProvider.tsx';
import { initializeDayjsConf } from './providers/dayjs.conf';
import { GlobalErrorBoundary } from './providers/GlobalErrorBoundary';
import { routesElements } from './routes/routesElements';
import { ServerConnectionScreen } from './ui/ServerConnectionScreen';

initializeDayjsConf();

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
      <GlobalErrorBoundary>
        {isServerReady && (
          <div className="app-entry-animation">
            <BrowserRouter>{routesElements()}</BrowserRouter>
          </div>
        )}
        {!isTransitionComplete && (
          <ServerConnectionScreen
            onConnected={handleConnected}
            onTransitionComplete={handleTransitionComplete}
          />
        )}
      </GlobalErrorBoundary>
    </AntdConfigProvider>
  );
};
