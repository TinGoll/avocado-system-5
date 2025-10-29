import { css } from '@emotion/css';
import type { FC } from 'react';
import { Outlet } from 'react-router';

const styles = css`
  height: 100vh;
  display: flex;
  flex-direction: column;
`;

export const AppLayout: FC = () => {
  return (
    <div className={styles}>
      <Outlet />
    </div>
  );
};
