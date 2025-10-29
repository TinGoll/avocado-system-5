import { App } from 'antd';
import type { FC, ReactNode } from 'react';

import { setMessageApi } from './messageProxy';

type Props = {
  children: ReactNode;
};
export const AntErrorMessageProvider: FC<Props> = ({ children }) => {
  const { message } = App.useApp();
  setMessageApi(message);
  return children;
};
