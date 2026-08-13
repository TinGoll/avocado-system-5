import type { FC } from 'react';
import { BrowserRouter } from 'react-router';

import { AntdConfigProvider } from './providers/AntdConfigProvider.tsx';
import { initializeDayjsConf } from './providers/dayjs.conf';
import { GlobalErrorBoundary } from './providers/GlobalErrorBoundary';
import { routesElements } from './routes/routesElements';

initializeDayjsConf();

export const App: FC = () => {
  return (
    <AntdConfigProvider>
      <GlobalErrorBoundary>
        <BrowserRouter>{routesElements()}</BrowserRouter>
      </GlobalErrorBoundary>
    </AntdConfigProvider>
  );
};
