import type { FC } from 'react';
import { BrowserRouter } from 'react-router';

import { AntdConfigProvider } from './providers/AntdConfigProvider.tsx';
import { initializeDayjsConf } from './providers/dayjs.conf';
import { routesElements } from './routes/routesElements';

initializeDayjsConf();

export const App: FC = () => {
  return (
    <AntdConfigProvider>
      <BrowserRouter>{routesElements()}</BrowserRouter>
    </AntdConfigProvider>
  );
};
