import { Result } from 'antd';
import type { FC } from 'react';

export const ServerError: FC = () => {
  return (
    <Result
      status="500"
      title="500"
      subTitle="Извините, что-то пошло не так."
    />
  );
};
