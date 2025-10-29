import '@ant-design/v5-patch-for-react-19';

import { ConfigProvider, theme } from 'antd';
import { App as AntApp } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import type { FC, ReactNode } from 'react';

import { AntErrorMessageProvider } from './AntErrorMessageProvider';

type Props = {
  children: ReactNode;
};
export const AntdConfigProvider: FC<Props> = ({ children }) => {
  return (
    <ConfigProvider locale={ruRU} theme={{ algorithm: theme.darkAlgorithm }}>
      <AntApp>
        <AntErrorMessageProvider>{children}</AntErrorMessageProvider>
      </AntApp>
    </ConfigProvider>
  );
};
