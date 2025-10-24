import { css } from '@emotion/css';
import type { FC } from 'react';
import { Outlet } from 'react-router';

const styles = css`
  height: 100vh;
  overflow: auto;
`;

export const AppLayout: FC = () => {
  return (
    <div className={styles}>
      <Outlet />
    </div>
  );
};
