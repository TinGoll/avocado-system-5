import { ConfigProvider, theme } from 'antd';
import { App as AntApp } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import type { FC, ReactNode } from 'react';

import { AntErrorMessageProvider } from './AntErrorMessageProvider';
import { GlobalErrorBoundary } from './GlobalErrorBoundary';

type Props = {
  children: ReactNode;
};
export const AntdConfigProvider: FC<Props> = ({ children }) => {
  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        algorithm: theme.darkAlgorithm,
        components: {
          Tabs: {
            horizontalMargin: '0 0 0 0',
          },
        },
      }}
    >
      <GlobalErrorBoundary>
        <AntApp notification={{ placement: 'top' }}>
          <AntErrorMessageProvider>{children}</AntErrorMessageProvider>
        </AntApp>
      </GlobalErrorBoundary>
    </ConfigProvider>
  );
};
